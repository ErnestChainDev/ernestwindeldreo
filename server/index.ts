import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";
import { loadEnvFile } from "node:process";
import { createSiteStats } from "./site-stats.ts";
import { createPortfolioAI } from "./portfolio-ai.ts";

// Existing deployment environment variables take precedence over local files.
for (const file of [".env.local", ".env"]) if (existsSync(file)) loadEnvFile(file);
const stats = createSiteStats();
const assistant = createPortfolioAI();
const dist = resolve("dist");
const types: Record<string, string> = {
    ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png",
    ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".wav": "audio/wav",
    ".woff2": "font/woff2", ".ttf": "font/ttf", ".otf": "font/otf", ".ico": "image/x-icon",
};

const server = createServer((request, response) => {
    assistant.handle(request, response, () => {
    stats.handle(request, response, () => {
        void (async () => {
            if (request.method !== "GET" && request.method !== "HEAD") { response.writeHead(405).end(); return; }
            const pathname = decodeURIComponent(new URL(request.url || "/", "http://localhost").pathname);
            let filename = resolve(dist, `.${pathname === "/" ? "/index.html" : pathname}`);
            if (!filename.startsWith(dist + sep)) { response.writeHead(403).end(); return; }
            const info = await stat(filename).catch((error: NodeJS.ErrnoException) => {
                // Browser refreshes on client routes need the same app entry document.
                const isPageRequest = request.headers.accept?.includes("text/html")
                    && !extname(pathname)
                    && !/^\/(api|assets|fonts)(\/|$)/.test(pathname);
                if (error.code !== "ENOENT" || !isPageRequest) throw error;

                filename = resolve(dist, "index.html");
                return stat(filename);
            });
            if (!info.isFile()) { response.writeHead(404).end(); return; }
            response.writeHead(200, {
                "Content-Type": types[extname(filename)] || "application/octet-stream",
                "Cache-Control": pathname.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
                "X-Content-Type-Options": "nosniff",
                "Content-Length": info.size,
            });
            if (request.method === "HEAD") response.end();
            else createReadStream(filename).on("error", () => response.destroy()).pipe(response);
        })().catch(() => { if (!response.headersSent) response.writeHead(404); response.end(); });
    });
    });
});

server.listen(Number(process.env.PORT || 3000), process.env.HOST || "0.0.0.0", () => {
    console.log(`Portfolio and live stats running on port ${process.env.PORT || 3000}`);
});

function close() {
    server.close();
}
process.once("SIGINT", close);
process.once("SIGTERM", close);
