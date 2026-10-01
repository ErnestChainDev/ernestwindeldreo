import type { IncomingMessage, ServerResponse } from "node:http";
import { portfolioContext } from "./portfolio-context.ts";

type Message = { role: "user" | "assistant"; content: string };
type Options = {
    apiKey?: string;
    model?: string;
    fetcher?: typeof fetch;
    timeoutMs?: number;
    requestsPerMinute?: number;
};

class RequestError extends Error {
    status: number;
    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

function json(response: ServerResponse, status: number, value: unknown) {
    if (response.destroyed || response.writableEnded) return;
    response.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    response.end(JSON.stringify(value));
}

async function readMessages(request: IncomingMessage): Promise<Message[]> {
    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
        throw new RequestError(415, "Please send a JSON request.");
    }
    const chunks: Buffer[] = [];
    let size = 0;
    for await (const chunk of request.iterator({ destroyOnReturn: false })) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        size += buffer.length;
        if (size > 32_768) {
            request.resume();
            throw new RequestError(413, "This conversation is too long. Please start a new chat.");
        }
        chunks.push(buffer);
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new RequestError(400, "Invalid chat request."); }

    if (!value || typeof value !== "object" || !("messages" in value) || !Array.isArray(value.messages)
        || value.messages.length < 1 || value.messages.length > 20) {
        throw new RequestError(400, "Please send between 1 and 20 messages.");
    }
    let characters = 0;
    const messages: Message[] = value.messages.map((message: unknown) => {
        if (!message || typeof message !== "object" || !("role" in message) || !("content" in message)
            || (message.role !== "user" && message.role !== "assistant") || typeof message.content !== "string"
            || !message.content.trim() || message.content.length > (message.role === "user" ? 2000 : 8000)) {
            throw new RequestError(400, "Please keep questions within 2,000 characters and use valid chat messages.");
        }
        characters += message.content.length;
        return { role: message.role, content: message.content.trim() };
    });
    if (characters > 24_000 || messages.at(-1)?.role !== "user") {
        throw new RequestError(400, "Please shorten the conversation and end with a question.");
    }
    return messages;
}

function replyFrom(value: unknown): string | undefined {
    if (!value || typeof value !== "object" || !("choices" in value) || !Array.isArray(value.choices)) return;
    const message = value.choices[0]?.message;
    return typeof message?.content === "string" && message.content.trim() ? message.content.trim() : undefined;
}

export function createPortfolioAI(options: Options = {}) {
    const apiKey = (options.apiKey ?? process.env.OPENROUTER_API_KEY ?? "").trim();
    const model = options.model?.trim() || process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-6-sol-pro";
    const fetcher = options.fetcher ?? fetch;
    const timeoutMs = options.timeoutMs ?? 90_000;
    const requestsPerMinute = options.requestsPerMinute ?? 12;
    const visitors = new Map<string, { count: number; resetAt: number }>();
    let globalWindow = { count: 0, resetAt: 0 };
    let activeRequests = 0;

    async function handle(request: IncomingMessage, response: ServerResponse) {
        if (request.method !== "POST") {
            response.setHeader("Allow", "POST");
            json(response, 405, { error: "Use POST to send a message." });
            return;
        }
        let allowedOrigin = request.headers["sec-fetch-site"] !== "cross-site";
        try {
            if (request.headers.origin && new URL(request.headers.origin).host !== request.headers.host) allowedOrigin = false;
        } catch { allowedOrigin = false; }
        if (!allowedOrigin) { json(response, 403, { error: "Origin not allowed." }); return; }

        const messages = await readMessages(request);
        if (!apiKey) {
            json(response, 503, { error: "The assistant isn't connected yet. Please try again later." });
            return;
        }

        const now = Date.now();
        for (const [address, window] of visitors) if (window.resetAt <= now) visitors.delete(address);
        if (globalWindow.resetAt <= now) globalWindow = { count: 0, resetAt: now + 60_000 };
        // Use the socket address rather than trusting visitor-supplied forwarding headers.
        const address = request.socket.remoteAddress || "unknown";
        const visitor = visitors.get(address) ?? { count: 0, resetAt: now + 60_000 };
        if (visitor.count >= requestsPerMinute || globalWindow.count >= 60 || activeRequests >= 4) {
            response.setHeader("Retry-After", "60");
            json(response, 429, { error: "The assistant is busy. Please wait a minute and try again." });
            return;
        }
        visitor.count++;
        globalWindow.count++;
        visitors.set(address, visitor);
        activeRequests++;

        const controller = new AbortController();
        const disconnected = () => { if (!response.writableEnded) controller.abort(); };
        response.once("close", disconnected);
        const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(timeoutMs)]);
        try {
            const upstream = await fetcher("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "X-OpenRouter-Title": "Ernest Windel Dreo Portfolio",
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: "system", content: portfolioContext }, ...messages],
                    max_tokens: 4096,
                    stream: false,
                }),
                signal,
            });
            if (!upstream.ok) {
                await upstream.body?.cancel();
                json(response, upstream.status === 429 ? 429 : 502, {
                    error: upstream.status === 429
                        ? "The assistant is busy. Please wait a minute and try again."
                        : "The assistant is temporarily unavailable. Please try again shortly.",
                });
                return;
            }
            const reply = replyFrom(await upstream.json());
            if (!reply) {
                json(response, 502, { error: "The assistant couldn't finish that response. Please try again." });
                return;
            }
            json(response, 200, { reply });
        } catch {
            if (controller.signal.aborted) return;
            json(response, signal.aborted ? 504 : 502, {
                error: signal.aborted
                    ? "That response took too long. Please try again."
                    : "The assistant couldn't connect. Please try again shortly.",
            });
        } finally {
            response.removeListener("close", disconnected);
            activeRequests--;
        }
    }

    return {
        handle(request: IncomingMessage, response: ServerResponse, next: () => void) {
            if (request.url?.split("?")[0] !== "/api/portfolio-ai") { next(); return; }
            void handle(request, response).catch(error => {
                json(response, error instanceof RequestError ? error.status : 500, {
                    error: error instanceof RequestError ? error.message : "The assistant is temporarily unavailable.",
                });
            });
        },
    };
}
