import type { IncomingMessage, ServerResponse } from "node:http";
import { createSiteStats } from "../server/site-stats.ts";
import { sendJson } from "../server/http.ts";
const stats = createSiteStats();
export default function handler(request: IncomingMessage, response: ServerResponse) {
    return stats.handle(request, response, () => sendJson(response, 404, { error: "Endpoint not found" }));
}
