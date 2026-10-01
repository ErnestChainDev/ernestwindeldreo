import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type StatsSnapshot = { views: number; likes: number; visitors: number; revision: number; liked: boolean };
export type StatsStore = {
    snapshot(visitorId: string): Promise<StatsSnapshot>;
    visit(visitorId: string, visitId: string): Promise<StatsSnapshot>;
    like(visitorId: string, liked: boolean): Promise<StatsSnapshot>;
};
type StatsDatabase = { public: {
    Tables: Record<string, never>; Views: Record<string, never>; Enums: Record<string, never>; CompositeTypes: Record<string, never>;
    Functions: {
        portfolio_stats_snapshot: { Args: { p_visitor_id: string }; Returns: StatsSnapshot[] };
        portfolio_record_visit: { Args: { p_visitor_id: string; p_visit_id: string }; Returns: StatsSnapshot[] };
        portfolio_set_like: { Args: { p_visitor_id: string; p_liked: boolean }; Returns: StatsSnapshot[] };
    };
} };
type Functions = StatsDatabase["public"]["Functions"];
export type SupabaseOptions = { url?: string; secretKey?: string; fetcher?: typeof fetch };
export class StatsUnavailable extends Error {
    code: string;
    constructor(code: string) { super("Stats temporarily unavailable"); this.code = code; }
}
function readSnapshot(value: unknown): StatsSnapshot {
    if (!value || typeof value !== "object") throw new StatsUnavailable("INVALID_SNAPSHOT");
    const result = value as StatsSnapshot;
    if (![result.views, result.likes, result.visitors, result.revision].every(count => Number.isSafeInteger(count) && count >= 0) || typeof result.liked !== "boolean") throw new StatsUnavailable("INVALID_SNAPSHOT");
    return result;
}
export function createSupabaseStats(options: SupabaseOptions = {}): StatsStore {
    let client: SupabaseClient<StatsDatabase> | undefined;
    async function call(name: keyof Functions, args: Functions[keyof Functions]["Args"]) {
        const url = options.url ?? process.env.SUPABASE_URL;
        const key = options.secretKey ?? process.env.SUPABASE_SECRET_KEY;
        if (!url || !key) throw new StatsUnavailable("MISSING_SUPABASE_CONFIG");
        client ??= createClient<StatsDatabase>(url, key, {
            auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
            global: { fetch: (input, init) => (options.fetcher ?? fetch)(input, { ...init, signal: AbortSignal.any([...(init?.signal ? [init.signal] : []), AbortSignal.timeout(10_000)]) }) },
        });
        const { data, error } = await client.rpc(name, args).single();
        if (error) throw new StatsUnavailable(error.code || "SUPABASE_REQUEST_FAILED");
        return readSnapshot(data);
    }
    return {
        snapshot: visitorId => call("portfolio_stats_snapshot", { p_visitor_id: visitorId }),
        visit: (visitorId, visitId) => call("portfolio_record_visit", { p_visitor_id: visitorId, p_visit_id: visitId }),
        like: (visitorId, liked) => call("portfolio_set_like", { p_visitor_id: visitorId, p_liked: liked }),
    };
}
