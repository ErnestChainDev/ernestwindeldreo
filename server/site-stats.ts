import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError, readJsonBody, sameOrigin, sendJson } from "./http.ts";
import { createSupabaseStats, StatsUnavailable, type StatsStore, type SupabaseOptions } from "./supabase-stats.ts";

const COOKIE = "ewd_visitor";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Options = SupabaseOptions & { store?: StatsStore };
export function createSiteStats(options: Options = {}) {
    const store = options.store ?? createSupabaseStats(options);
    function visitorFor(request: IncomingMessage, response: ServerResponse) {
        const cookie = request.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith(`${COOKIE}=`));
        const supplied = cookie?.slice(COOKIE.length + 1);
        if (supplied && UUID.test(supplied)) return supplied;
        const id = randomUUID();
        const secure = process.env.NODE_ENV === "production" || process.env.VERCEL ? "; Secure" : "";
        response.setHeader("Set-Cookie", `${COOKIE}=${id}; HttpOnly; SameSite=Lax; Path=/; Max-Age=31536000${secure}`);
        return id;
    }
    async function handleRequest(request: IncomingMessage, response: ServerResponse, path: string) {
        if (!sameOrigin(request)) { sendJson(response, 403, { error: "Origin not allowed" }); return; }
        const method = path === "/api/site-stats" ? "GET" : path === "/api/site-stats/visit" || path === "/api/site-stats/like" ? "POST" : undefined;
        if (!method) { sendJson(response, 404, { error: "Endpoint not found" }); return; }
        if (request.method !== method) {
            response.setHeader("Allow", method);
            sendJson(response, 405, { error: `Use ${method} for this endpoint` });
            return;
        }
        if (method === "GET") { sendJson(response, 200, await store.snapshot(visitorFor(request, response))); return; }
        const payload = await readJsonBody(request, 1024);
        if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new HttpError(400, "Invalid request body");
        const isVisit = path.endsWith("/visit");
        if (isVisit ? !("visitId" in payload) || typeof payload.visitId !== "string" || !UUID.test(payload.visitId) : !("liked" in payload) || typeof payload.liked !== "boolean") throw new HttpError(400, "Invalid request values");
        const visitorId = visitorFor(request, response);
        const value = isVisit
            ? await store.visit(visitorId, (payload as { visitId: string }).visitId)
            : await store.like(visitorId, (payload as { liked: boolean }).liked);
        sendJson(response, 200, value);
    }
    return {
        handle(request: IncomingMessage, response: ServerResponse, next: () => void) {
            const path = request.url?.split("?")[0]?.replace(/\/$/, "") || "/";
            if (path !== "/api/site-stats" && !path.startsWith("/api/site-stats/")) { next(); return; }
            return handleRequest(request, response, path).catch(error => {
                if (!(error instanceof HttpError)) console.error("Site stats request failed:", { code: error instanceof StatsUnavailable ? error.code : "UNEXPECTED_ERROR" });
                sendJson(response, error instanceof HttpError ? error.status : 503, { error: error instanceof HttpError ? error.message : "Stats temporarily unavailable. Please try again." });
            });
        },
    };
}
