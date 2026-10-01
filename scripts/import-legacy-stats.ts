import { DatabaseSync } from "node:sqlite";
import { resolve } from "node:path";
import { databaseConnection } from "./database.ts";
// One-time, read-only import. The application itself uses only Supabase.
const legacy = new DatabaseSync(resolve(process.argv[2] || "data/site-stats.sqlite"), { readOnly: true });
const visitors = legacy.prepare("select id from visitors").all();
const visits = legacy.prepare("select id, visitor_id from visits").all();
const likes = legacy.prepare("select visitor_id from likes").all();
legacy.close();
const sql = databaseConnection();
try {
    await sql.begin(async transaction => {
        await transaction`select id from public.portfolio_stats where id = 1 for update`;
        if (visitors.length) await transaction`insert into public.portfolio_visitors ${transaction(visitors, "id")} on conflict (id) do nothing`;
        if (visits.length) await transaction`insert into public.portfolio_visits ${transaction(visits, "id", "visitor_id")} on conflict (id) do nothing`;
        if (likes.length) await transaction`insert into public.portfolio_likes ${transaction(likes, "visitor_id")} on conflict (visitor_id) do nothing`;
        await transaction`update public.portfolio_stats set
            views = (select count(*) from public.portfolio_visits),
            likes = (select count(*) from public.portfolio_likes),
            visitors = (select count(distinct visitor_id) from public.portfolio_visits),
            revision = revision + 1 where id = 1`;
    });
    const [counts] = await sql`select * from public.portfolio_stats_snapshot(null::uuid)`;
    console.log("Legacy stats preserved in Supabase:", counts);
} catch (error) {
    console.error("Stats import failed:", { code: (error as { code?: string }).code ?? "IMPORT_ERROR" });
    process.exitCode = 1;
} finally { await sql.end({ timeout: 3 }); }
