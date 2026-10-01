import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const COOKIE = "ewd_visitor";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createSiteStats(databasePath = process.env.SITE_STATS_DB || resolve("data/site-stats.sqlite")) {
    if (databasePath !== ":memory:") mkdirSync(dirname(databasePath), { recursive: true });
    const db = new DatabaseSync(databasePath);
    db.exec(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;
        PRAGMA busy_timeout = 5000;
        CREATE TABLE IF NOT EXISTS visitors (id TEXT PRIMARY KEY);
        CREATE TABLE IF NOT EXISTS visits (
            id TEXT PRIMARY KEY,
            visitor_id TEXT NOT NULL REFERENCES visitors(id)
        );
        CREATE INDEX IF NOT EXISTS visits_by_visitor ON visits(visitor_id);
        CREATE TABLE IF NOT EXISTS likes (visitor_id TEXT PRIMARY KEY REFERENCES visitors(id));
        CREATE TABLE IF NOT EXISTS stats_revision (id INTEGER PRIMARY KEY CHECK (id = 1), value INTEGER NOT NULL);
        INSERT OR IGNORE INTO stats_revision VALUES (1, 0);
    `);

    const clients = new Set<{ response: ServerResponse; visitorId: string }>();
    const counts = db.prepare(`SELECT
        (SELECT COUNT(*) FROM visits) AS views,
        (SELECT COUNT(*) FROM likes) AS likes,
        (SELECT COUNT(DISTINCT visitor_id) FROM visits) AS visitors,
        (SELECT value FROM stats_revision WHERE id = 1) AS revision`);
    const hasLiked = db.prepare("SELECT 1 FROM likes WHERE visitor_id = ?");
    const hasVisitor = db.prepare("SELECT 1 FROM visitors WHERE id = ?");
    const addVisitor = db.prepare("INSERT INTO visitors (id) VALUES (?)");
    const addVisit = db.prepare("INSERT OR IGNORE INTO visits (id, visitor_id) VALUES (?, ?)");
    const addLike = db.prepare("INSERT OR IGNORE INTO likes (visitor_id) VALUES (?)");
    const removeLike = db.prepare("DELETE FROM likes WHERE visitor_id = ?");
    const bumpRevision = db.prepare("UPDATE stats_revision SET value = value + 1 WHERE id = 1");

    function snapshot(visitorId: string) {
        return { ...counts.get(), liked: Boolean(hasLiked.get(visitorId)) };
    }

    function sendEvent(client: { response: ServerResponse; visitorId: string }) {
        if (!client.response.destroyed) {
            client.response.write(`data: ${JSON.stringify(snapshot(client.visitorId))}\n\n`);
        }
    }

    function broadcast() {
        for (const client of clients) sendEvent(client);
    }

    const heartbeat = setInterval(() => {
        for (const { response } of clients) response.write(": keep-alive\n\n");
    }, 20_000);
    heartbeat.unref();

    function visitorFor(request: IncomingMessage, response: ServerResponse) {
        const cookie = request.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
        const supplied = cookie?.slice(COOKIE.length + 1);
        if (supplied && UUID.test(supplied) && hasVisitor.get(supplied)) return supplied;
        const id = randomUUID();
        addVisitor.run(id);
        const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
        response.setHeader("Set-Cookie", `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure}`);
        return id;
    }

    function json(response: ServerResponse, status: number, value: unknown) {
        response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" });
        response.end(JSON.stringify(value));
    }

    async function body(request: IncomingMessage): Promise<Record<string, unknown>> {
        if (!request.headers["content-type"]?.startsWith("application/json")) throw new Error("Expected JSON");
        let text = "";
        for await (const chunk of request) {
            text += chunk.toString();
            if (Buffer.byteLength(text) > 1024) throw new Error("Request too large");
        }
        const value: unknown = JSON.parse(text);
        if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Expected an object");
        return value as Record<string, unknown>;
    }

    async function handleRequest(request: IncomingMessage, response: ServerResponse, path: string) {
        // Mutation requests must come from this site's origin. No public write CORS.
        const origin = request.headers.origin;
        if (origin && new URL(origin).host !== request.headers.host) {
            json(response, 403, { error: "Origin not allowed" });
            return;
        }
        if (request.headers["sec-fetch-site"] === "cross-site") {
            json(response, 403, { error: "Origin not allowed" });
            return;
        }

        if (path === "/api/site-stats" && request.method === "GET") {
            const visitorId = visitorFor(request, response);
            json(response, 200, snapshot(visitorId));
            return;
        }
        if (path === "/api/site-stats/events" && request.method === "GET") {
            const visitorId = visitorFor(request, response);
            response.writeHead(200, {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache, no-transform",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no",
            });
            response.write("retry: 2000\n\n");
            const client = { response, visitorId };
            clients.add(client);
            sendEvent(client);
            response.on("close", () => clients.delete(client));
            return;
        }
        if ((path === "/api/site-stats/visit" || path === "/api/site-stats/like") && request.method === "POST") {
            let payload: Record<string, unknown>;
            try {
                payload = await body(request);
            } catch {
                json(response, 400, { error: "Invalid request body" });
                return;
            }
            const isVisit = path.endsWith("/visit");
            if (isVisit ? typeof payload.visitId !== "string" || !UUID.test(payload.visitId) : typeof payload.liked !== "boolean") {
                json(response, 400, { error: "Invalid request values" });
                return;
            }
            const visitorId = visitorFor(request, response);
            db.exec("BEGIN IMMEDIATE");
            let changed: boolean;
            try {
                const result = isVisit
                    ? addVisit.run(payload.visitId as string, visitorId)
                    : (payload.liked ? addLike : removeLike).run(visitorId);
                changed = Number(result.changes) > 0;
                if (changed) bumpRevision.run();
                db.exec("COMMIT");
            } catch (error) {
                db.exec("ROLLBACK");
                throw error;
            }
            json(response, 200, snapshot(visitorId));
            if (changed) broadcast();
            return;
        }
        json(response, 404, { error: "Endpoint not found" });
    }

    return {
        handle(request: IncomingMessage, response: ServerResponse, next: () => void) {
            const path = request.url?.split("?")[0] || "/";
            if (path !== "/api/site-stats" && !path.startsWith("/api/site-stats/")) { next(); return; }
            void handleRequest(request, response, path).catch(error => {
                console.error("Site stats request failed:", error);
                if (!response.headersSent) json(response, 500, { error: "Stats temporarily unavailable" });
                else response.end();
            });
        },
        close() {
            clearInterval(heartbeat);
            for (const { response } of clients) response.end();
            clients.clear();
            db.close();
        },
    };
}
