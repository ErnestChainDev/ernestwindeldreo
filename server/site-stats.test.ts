import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createServer, type IncomingMessage } from "node:http";
import { test } from "node:test";
import { createSiteStats } from "./site-stats.ts";
import type { StatsSnapshot, StatsStore } from "./supabase-stats.ts";

function memoryStore(): StatsStore {
    const visits = new Map<string, string>(); const likes = new Set<string>(); let revision = 0;
    const snapshot = (id: string) => ({ views: visits.size, likes: likes.size, visitors: new Set(visits.values()).size, revision, liked: likes.has(id) });
    return {
        snapshot: async id => snapshot(id),
        visit: async (id, visit) => { if (!visits.has(visit)) { visits.set(visit, id); revision++; } return snapshot(id); },
        like: async (id, liked) => { if (likes.has(id) !== liked) { if (liked) likes.add(id); else likes.delete(id); revision++; } return snapshot(id); },
    };
}
async function fixture(store = memoryStore(), parsed = false) {
    const stats = createSiteStats({ store });
    const server = createServer(async (request, response) => {
        if (parsed && request.method === "POST") {
            let raw = ""; for await (const chunk of request) raw += chunk.toString();
            (request as IncomingMessage & { body?: unknown }).body = JSON.parse(raw);
        }
        await stats.handle(request, response, () => response.writeHead(404).end());
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("No test address");
    return { base: `http://127.0.0.1:${address.port}`, async close() { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); } };
}
function client(base: string, initialCookie = "") {
    let cookie = initialCookie;
    return {
        get cookie() { return cookie; },
        async request(endpoint: string, body?: unknown) {
            const response = await fetch(`${base}/api/site-stats${endpoint}`, { method: body === undefined ? "GET" : "POST", headers: { Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, body: body === undefined ? undefined : JSON.stringify(body) });
            const setCookie = response.headers.get("set-cookie"); if (setCookie) cookie = setCookie.split(";")[0];
            assert.equal(response.status, 200); assert.equal(response.headers.get("cache-control"), "no-store");
            return await response.json() as StatsSnapshot;
        },
    };
}
test("registers a tab once and keeps the anonymous visitor cookie", async t => {
    const app = await fixture(); t.after(app.close); const first = client(app.base); const visitId = randomUUID();
    assert.equal((await first.request("/visit", { visitId })).views, 1);
    assert.match(first.cookie, /^ewd_visitor=/);
    await Promise.all(Array.from({ length: 8 }, () => first.request("/visit", { visitId })));
    assert.equal((await first.request("")).views, 1);
    assert.equal((await first.request("/visit", { visitId: randomUUID() })).visitors, 1);
    const totals = await client(app.base).request("/visit", { visitId: randomUUID() });
    assert.equal(totals.views, 3); assert.equal(totals.visitors, 2);
});
test("like retries are idempotent and like state belongs to each cookie", async t => {
    const app = await fixture(); t.after(app.close); const a = client(app.base), b = client(app.base);
    await a.request("/visit", { visitId: randomUUID() }); await b.request("/visit", { visitId: randomUUID() });
    await Promise.all(Array.from({ length: 8 }, () => a.request("/like", { liked: true })));
    assert.equal((await a.request("")).likes, 1); assert.equal((await b.request("")).liked, false);
    assert.equal((await b.request("/like", { liked: true })).likes, 2);
    await a.request("/like", { liked: false }); const totals = await a.request("/like", { liked: false });
    assert.equal(totals.likes, 1); assert.equal(totals.liked, false);
});
test("separate server instances read shared stats without a process-local broadcaster", async t => {
    const store = memoryStore(); const first = await fixture(store), second = await fixture(store); t.after(first.close); t.after(second.close);
    const a = client(first.base); const visitId = randomUUID(); await a.request("/visit", { visitId });
    const original = await a.request("/like", { liked: true });
    assert.deepEqual(await client(second.base, a.cookie).request("/visit", { visitId }), original);
});
test("accepts Vercel's parsed request body", async t => {
    const app = await fixture(memoryStore(), true); t.after(app.close); const visitor = client(app.base);
    assert.equal((await visitor.request("/visit", { visitId: randomUUID() })).views, 1);
    assert.equal((await visitor.request("/like", { liked: true })).liked, true);
});
test("rejects invalid JSON, oversized bodies, methods and cross-site requests before database access", async t => {
    let called = false; const fail = async () => { called = true; throw new Error("Must not reach database"); };
    const app = await fixture({ snapshot: fail, visit: fail, like: fail }); t.after(app.close);
    const post = (endpoint: string, body: string, headers = {}) => fetch(`${app.base}/api/site-stats/${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body });
    for (const [endpoint, body, status] of [["visit", '{"visitId":"invalid"}', 400], ["like", '{"liked":"yes"}', 400], ["like", "{bad", 400], ["like", "[]", 400], ["like", JSON.stringify({ liked: true, padding: "x".repeat(1100) }), 413]] as const) assert.equal((await post(endpoint, body)).status, status);
    assert.equal((await post("like", '{"liked":true}', { Origin: "https://other.example" })).status, 403);
    assert.equal((await post("like", '{"liked":true}', { Origin: "not-a-url" })).status, 403);
    assert.equal((await post("like", '{"liked":true}', { "Sec-Fetch-Site": "cross-site" })).status, 403);
    assert.equal((await fetch(`${app.base}/api/site-stats/like`)).status, 405);
    assert.equal((await fetch(`${app.base}/api/site-stats/events`)).status, 404);
    assert.equal((await fetch(`${app.base}/unrelated`)).status, 404);
    assert.equal(called, false);
});
test("database errors produce retryable responses without credentials or SQL details", async t => {
    const fail = async () => { throw new Error("private-db-password-and-query"); };
    const app = await fixture({ snapshot: fail, visit: fail, like: fail }); t.after(app.close);
    const response = await fetch(`${app.base}/api/site-stats`);
    assert.equal(response.status, 503); assert.doesNotMatch(await response.text(), /private-db|password|query/);
});
