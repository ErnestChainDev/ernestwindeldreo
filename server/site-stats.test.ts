import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createSiteStats } from './site-stats.ts';

type Snapshot = { views: number; likes: number; visitors: number; revision: number; liked: boolean };

async function fixture(databasePath = ':memory:') {
    const stats = createSiteStats(databasePath);
    const server = createServer((request, response) => stats.handle(request, response, () => response.writeHead(404).end()));
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('No test address');
    const base = `http://127.0.0.1:${address.port}`;
    let closed = false;
    return {
        base,
        async close() {
            if (closed) return;
            closed = true;
            stats.close();
            server.closeAllConnections();
            await new Promise<void>(resolve => server.close(() => resolve()));
        },
    };
}

function client(base: string, initialCookie = '') {
    let cookie = initialCookie;
    return {
        get cookie() { return cookie; },
        async request(endpoint: string, body?: unknown) {
            const response = await fetch(`${base}/api/site-stats${endpoint}`, {
                method: body === undefined ? 'GET' : 'POST',
                headers: { Cookie: cookie, ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
                body: body === undefined ? undefined : JSON.stringify(body),
            });
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) cookie = setCookie.split(';')[0];
            assert.equal(response.status, 200);
            return await response.json() as Snapshot;
        },
    };
}

async function stream(base: string, cookie: string) {
    const controller = new AbortController();
    const response = await fetch(`${base}/api/site-stats/events`, { headers: { Cookie: cookie }, signal: controller.signal });
    assert.match(response.headers.get('content-type') || '', /text\/event-stream/);
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    return {
        close() { controller.abort(); },
        async next(): Promise<Snapshot> {
            const timeout = setTimeout(() => controller.abort(), 4000);
            try {
                while (true) {
                    let end: number;
                    while ((end = buffer.indexOf('\n\n')) !== -1) {
                        const event = buffer.slice(0, end);
                        buffer = buffer.slice(end + 2);
                        const line = event.split('\n').find(value => value.startsWith('data: '));
                        if (line) return JSON.parse(line.slice(6)) as Snapshot;
                    }
                    const part = await reader.read();
                    if (part.done) throw new Error('Event stream ended');
                    buffer += decoder.decode(part.value, { stream: true });
                }
            } finally { clearTimeout(timeout); }
        },
    };
}

test('counts real visits once per tab session and counts separate visitors', async t => {
    const app = await fixture();
    t.after(() => app.close());
    const first = client(app.base);
    const visitId = randomUUID();
    assert.equal((await first.request('/visit', { visitId })).views, 1);
    assert.match(first.cookie, /^ewd_visitor=/);
    await Promise.all(Array.from({ length: 8 }, () => first.request('/visit', { visitId })));
    assert.equal((await first.request('')).views, 1);
    const secondTab = await first.request('/visit', { visitId: randomUUID() });
    assert.equal(secondTab.views, 2);
    assert.equal(secondTab.visitors, 1);
    const other = client(app.base);
    const totals = await other.request('/visit', { visitId: randomUUID() });
    assert.equal(totals.views, 3);
    assert.equal(totals.visitors, 2);
});

test('likes are idempotent per browser and can be removed without negative totals', async t => {
    const app = await fixture();
    t.after(() => app.close());
    const first = client(app.base);
    const second = client(app.base);
    await first.request('/visit', { visitId: randomUUID() });
    await second.request('/visit', { visitId: randomUUID() });
    await Promise.all(Array.from({ length: 8 }, () => first.request('/like', { liked: true })));
    assert.equal((await first.request('')).likes, 1);
    assert.equal((await first.request('')).liked, true);
    assert.equal((await second.request('')).liked, false);
    assert.equal((await second.request('/like', { liked: true })).likes, 2);
    await first.request('/like', { liked: false });
    const counts = await first.request('/like', { liked: false });
    assert.equal(counts.likes, 1);
    assert.equal(counts.liked, false);
});

test('pushes updated totals and each browser\'s like state to live subscribers', async t => {
    const app = await fixture();
    t.after(() => app.close());
    const first = client(app.base);
    const second = client(app.base);
    await first.request('/visit', { visitId: randomUUID() });
    await second.request('/visit', { visitId: randomUUID() });
    const a = await stream(app.base, first.cookie);
    const b = await stream(app.base, second.cookie);
    t.after(() => { a.close(); b.close(); });
    assert.equal((await a.next()).views, 2);
    assert.equal((await b.next()).likes, 0);
    await first.request('/like', { liked: true });
    const mine = await a.next();
    const theirs = await b.next();
    assert.equal(mine.likes, 1);
    assert.equal(mine.liked, true);
    assert.equal(theirs.likes, 1);
    assert.equal(theirs.liked, false);
    await second.request('/visit', { visitId: randomUUID() });
    assert.equal((await a.next()).views, 3);
    assert.equal((await b.next()).views, 3);
});

test('persists totals, deduplication, and likes after a server restart', async t => {
    const databasePath = join(tmpdir(), `ewd-stats-test-${randomUUID()}.sqlite`);
    const firstServer = await fixture(databasePath);
    const visitor = client(firstServer.base);
    const visitId = randomUUID();
    await visitor.request('/visit', { visitId });
    const original = await visitor.request('/like', { liked: true });
    await firstServer.close();
    const restarted = await fixture(databasePath);
    t.after(async () => {
        await restarted.close();
        for (const suffix of ['', '-wal', '-shm']) rmSync(databasePath + suffix, { force: true });
    });
    const returning = client(restarted.base, visitor.cookie);
    assert.deepEqual(await returning.request('/visit', { visitId }), original);
});

test('rejects malformed writes and cross-origin mutations without changing counts', async t => {
    const app = await fixture();
    t.after(() => app.close());
    for (const [endpoint, body] of [['visit', { visitId: 'invalid' }], ['like', { liked: 'yes' }]]) {
        const response = await fetch(`${app.base}/api/site-stats/${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        assert.equal(response.status, 400);
    }
    const crossOrigin = await fetch(`${app.base}/api/site-stats/like`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://other.example' }, body: JSON.stringify({ liked: true }),
    });
    assert.equal(crossOrigin.status, 403);
    const counts = await client(app.base).request('');
    assert.equal(counts.views, 0);
    assert.equal(counts.likes, 0);
});
