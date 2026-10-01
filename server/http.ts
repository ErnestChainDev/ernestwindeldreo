import type { IncomingMessage, ServerResponse } from "node:http";

export class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) { super(message); this.status = status; }
}
export function sendJson(response: ServerResponse, status: number, value: unknown) {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify(value));
}
export function sameOrigin(request: IncomingMessage) {
    if (request.headers["sec-fetch-site"] === "cross-site") return false;
    try { return !request.headers.origin || new URL(request.headers.origin).host === request.headers.host; }
    catch { return false; }
}
export async function readJsonBody(request: IncomingMessage, maxBytes: number): Promise<unknown> {
    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) throw new HttpError(415, "Please send a JSON request.");
    // Vercel can supply a parsed body; local Node/Vite requests use the stream.
    const supplied = (request as IncomingMessage & { body?: unknown }).body;
    if (supplied !== undefined) {
        const text = typeof supplied === "string" ? supplied : Buffer.isBuffer(supplied) ? supplied.toString("utf8") : JSON.stringify(supplied);
        if (!text || Buffer.byteLength(text) > maxBytes) throw new HttpError(413, "Request too large.");
        try { return JSON.parse(text); } catch { throw new HttpError(400, "Invalid JSON request."); }
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > maxBytes) { request.resume(); throw new HttpError(413, "Request too large."); }
        chunks.push(buffer);
    }
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new HttpError(400, "Invalid JSON request."); }
}
