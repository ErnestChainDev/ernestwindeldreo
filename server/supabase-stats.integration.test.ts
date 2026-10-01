import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { createClient } from "@supabase/supabase-js";
import { databaseConnection } from "../scripts/database.ts";
import { createSupabaseStats } from "./supabase-stats.ts";

const sql = databaseConnection();
const normalize = (row: Record<string, unknown>) => ({ views: Number(row.views), likes: Number(row.likes), visitors: Number(row.visitors), revision: Number(row.revision), liked: row.liked });
const rollback = new Error("Test transaction rollback");

test("Supabase functions atomically deduplicate views/likes and count unique visitors", async () => {
    await assert.rejects(sql.begin(async transaction => {
        const [initial] = await transaction`select * from public.portfolio_stats_snapshot(null::uuid)`;
        const before = normalize(initial); const visitor = randomUUID(), visit = randomUUID(), other = randomUUID();
        for (let i = 0; i < 8; i++) {
            const [row] = await transaction`select * from public.portfolio_record_visit(${visitor}::uuid, ${visit}::uuid)`;
            assert.equal(Number(row.views), before.views + 1); assert.equal(Number(row.visitors), before.visitors + 1);
        }
        await transaction`select * from public.portfolio_record_visit(${visitor}::uuid, ${randomUUID()}::uuid)`;
        const [row] = await transaction`select * from public.portfolio_record_visit(${other}::uuid, ${randomUUID()}::uuid)`;
        assert.equal(Number(row.views), before.views + 3); assert.equal(Number(row.visitors), before.visitors + 2);
        for (let i = 0; i < 8; i++) {
            const [liked] = await transaction`select * from public.portfolio_set_like(${visitor}::uuid, true)`;
            assert.equal(Number(liked.likes), before.likes + 1); assert.equal(liked.liked, true);
        }
        const [theirs] = await transaction`select * from public.portfolio_stats_snapshot(${other}::uuid)`;
        assert.equal(theirs.liked, false);
        await transaction`select * from public.portfolio_set_like(${visitor}::uuid, false)`;
        const [unliked] = await transaction`select * from public.portfolio_set_like(${visitor}::uuid, false)`;
        assert.equal(Number(unliked.likes), before.likes); assert.equal(unliked.liked, false);
        assert.equal(Number(unliked.revision), before.revision + 5);
        throw rollback;
    }), error => error === rollback);
});

test("parallel RPC requests remain idempotent and persist across independent server clients", async () => {
    const first = createSupabaseStats(), second = createSupabaseStats();
    const visitor = randomUUID(), visit = randomUUID();
    try {
        await Promise.all(Array.from({ length: 8 }, () => first.visit(visitor, visit)));
        const [visits] = await sql`select count(*)::int as total from public.portfolio_visits where visitor_id = ${visitor}::uuid`;
        assert.equal(visits.total, 1);
        await Promise.all(Array.from({ length: 8 }, () => first.like(visitor, true)));
        assert.equal((await second.snapshot(visitor)).liked, true);
        const [likes] = await sql`select count(*)::int as total from public.portfolio_likes where visitor_id = ${visitor}::uuid`;
        assert.equal(likes.total, 1);
        const before = await second.snapshot(visitor);
        assert.deepEqual(await second.visit(visitor, visit), before);
        await Promise.all(Array.from({ length: 5 }, () => second.like(visitor, false)));
        assert.equal((await first.snapshot(visitor)).liked, false);
    } finally {
        // Remove only this test's random visitor, retaining real engagement.
        await sql.begin(async transaction => {
            await transaction`select id from public.portfolio_stats where id = 1 for update`;
            await transaction`delete from public.portfolio_likes where visitor_id = ${visitor}::uuid`;
            await transaction`delete from public.portfolio_visits where visitor_id = ${visitor}::uuid`;
            await transaction`delete from public.portfolio_visitors where id = ${visitor}::uuid`;
            await transaction`update public.portfolio_stats set views = (select count(*) from public.portfolio_visits), likes = (select count(*) from public.portfolio_likes), visitors = (select count(distinct visitor_id) from public.portfolio_visits), revision = revision + 1 where id = 1`;
        });
    }
});

test("RLS and privileges block browser access to visitor rows and stats RPCs", async () => {
    const tables = await sql`select c.relname, c.relrowsecurity,
        has_table_privilege('anon', c.oid, 'SELECT') as anon_read,
        has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_write
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relname in ('portfolio_visitors','portfolio_visits','portfolio_likes','portfolio_stats')`;
    assert.equal(tables.length, 4);
    for (const row of tables) { assert.equal(row.relrowsecurity, true); assert.equal(row.anon_read, false); assert.equal(row.authenticated_write, false); }
    const functions = await sql`select p.proname, p.prosecdef, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
        has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_execute,
        has_function_privilege('service_role', p.oid, 'EXECUTE') as server_execute
        from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname in ('portfolio_stats_snapshot','portfolio_record_visit','portfolio_set_like')`;
    assert.equal(functions.length, 3);
    for (const row of functions) { assert.equal(row.prosecdef, false); assert.equal(row.anon_execute, false); assert.equal(row.authenticated_execute, false); assert.equal(row.server_execute, true); }
    const browser = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await browser.from("portfolio_visits").select("id");
    assert.equal(error?.code, "42501");
});

test.after(async () => { await sql.end({ timeout: 3 }); });
