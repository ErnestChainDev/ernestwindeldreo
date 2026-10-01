import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, symlinkSync, unlinkSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import ts from "typescript";

test("compiled Vercel functions load and handle parsed requests using only server environment variables", async t => {
    const project = resolve(".");
    const output = mkdtempSync(join(tmpdir(), "ewd-compiled-api-test-"));
    const dependencies = join(output, "node_modules");
    // Keep emitted files separate from source so missing .ts imports fail at runtime.
    symlinkSync(join(project, "node_modules"), dependencies, "junction");
    t.after(() => {
        unlinkSync(dependencies);
        assert(output.startsWith(resolve(tmpdir()) + sep));
        rmSync(output, { recursive: true, force: true });
    });
    const entries = ["api/site-stats.ts", "api/site-stats/visit.ts", "api/site-stats/like.ts", "api/portfolio-ai.ts"];
    const config = ts.readConfigFile(join(project, "tsconfig.json"), ts.sys.readFile);
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, project);
    const program = ts.createProgram(entries.map(file => join(project, file)), {
        ...parsed.options, noEmit: false, outDir: output, rootDir: project, incremental: false, composite: false,
    });
    const diagnostics = [...ts.getPreEmitDiagnostics(program), ...program.emit().diagnostics];
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
        getCanonicalFileName: file => file, getCurrentDirectory: () => project, getNewLine: () => "\n",
    }));
    writeFileSync(join(output, "package.json"), JSON.stringify({ type: "module" }));
    const vercel = JSON.parse(readFileSync(join(project, "vercel.json"), "utf8"));
    for (const entry of entries) assert(entry in vercel.functions, `Deploy ${entry}`);

    const nativeFetch = globalThis.fetch;
    const visits = new Map<string, string>();
    const likes = new Set<string>();
    let databaseRequests = 0;
    const snapshot = (id: string) => ({ views: visits.size, likes: likes.size, visitors: new Set(visits.values()).size, revision: visits.size + likes.size, liked: likes.has(id) });
    process.env.SUPABASE_URL = "https://supabase.example";
    process.env.SUPABASE_SECRET_KEY = "sb_secret_test_server_only";
    process.env.OPENROUTER_API_KEY = "test_server_only";
    process.env.OPENROUTER_MODEL = "test/model";
    globalThis.fetch = async (input, init) => {
        const url = String(input);
        if (url.startsWith("https://supabase.example/rest/v1/rpc/")) {
            databaseRequests++;
            const payload = JSON.parse(String(init?.body));
            if (url.endsWith("portfolio_record_visit")) visits.set(payload.p_visit_id, payload.p_visitor_id);
            if (url.endsWith("portfolio_set_like")) {
                if (payload.p_liked) likes.add(payload.p_visitor_id); else likes.delete(payload.p_visitor_id);
            }
            return Response.json(snapshot(payload.p_visitor_id));
        }
        if (url === "https://openrouter.ai/api/v1/chat/completions") {
            const payload = JSON.parse(String(init?.body));
            assert.equal(payload.model, "test/model");
            assert.equal(payload.messages[0].role, "system");
            return Response.json({ choices: [{ message: { content: "Test response" } }] });
        }
        assert(url.startsWith("http://127.0.0.1:"), "Unexpected upstream request");
        return nativeFetch(input, init);
    };
    t.after(() => { globalThis.fetch = nativeFetch; });
    type Handler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;
    const handlers = new Map<string, Handler>();
    for (const entry of entries) {
        const emitted = join(output, entry.replace(/\.ts$/, ".js"));
        handlers.set("/" + entry.replace(/\.ts$/, ""), (await import(pathToFileURL(emitted).href)).default);
    }
    const server = createServer(async (request, response) => {
        if (request.method === "POST") {
            let raw = ""; for await (const chunk of request) raw += chunk.toString();
            (request as IncomingMessage & { body?: unknown }).body = JSON.parse(raw);
        }
        const handler = handlers.get(request.url || "");
        if (!handler) { response.writeHead(404).end(); return; }
        const pending = handler(request, response);
        assert(pending instanceof Promise, "Vercel must wait for the asynchronous response");
        await pending;
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    t.after(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
    const address = server.address(); assert(address && typeof address === "object");
    const origin = `http://127.0.0.1:${address.port}`;
    let cookie = "";
    async function request(path: string, body?: unknown, originHeader = origin) {
        const response = await nativeFetch(origin + path, {
            method: body === undefined ? "GET" : "POST",
            headers: { Origin: originHeader, Cookie: cookie, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        });
        const savedCookie = response.headers.get("set-cookie"); if (savedCookie) cookie = savedCookie.split(";")[0];
        return response;
    }
    assert.equal((await request("/api/site-stats")).status, 200);
    const visit = { visitId: randomUUID() };
    assert.equal((await (await request("/api/site-stats/visit", visit)).json()).views, 1);
    assert.equal((await (await request("/api/site-stats/like", { liked: true })).json()).liked, true);
    assert.equal((await (await request("/api/site-stats/like", { liked: false })).json()).likes, 0);
    assert.equal((await request("/api/site-stats/visit", {})).status, 400);
    assert.equal((await request("/api/site-stats/like", { liked: true }, "https://other.example")).status, 403);
    const beforeAI = databaseRequests;
    const reply = await request("/api/portfolio-ai", { messages: [{ role: "user", content: "Hello" }] });
    assert.equal(reply.status, 200);
    assert.deepEqual(await reply.json(), { reply: "Test response" });
    assert.equal(databaseRequests, beforeAI, "AI makes no database request");
    assert.equal((await request("/api/portfolio-ai", {})).status, 400);
});
