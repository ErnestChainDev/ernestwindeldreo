import type { IncomingMessage, ServerResponse } from "node:http";
import statsHandler from "../site-stats.ts";

export default function handler(request: IncomingMessage, response: ServerResponse) {
    return statsHandler(request, response);
}
