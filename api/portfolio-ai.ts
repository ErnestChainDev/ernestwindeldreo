import type { IncomingMessage, ServerResponse } from "node:http";
import { createPortfolioAI } from "../server/portfolio-ai.ts";
import { sendJson } from "../server/http.ts";
const assistant = createPortfolioAI();
export default function handler(request: IncomingMessage, response: ServerResponse) {
    return assistant.handle(request, response, () => sendJson(response, 404, { error: "Endpoint not found" }));
}
