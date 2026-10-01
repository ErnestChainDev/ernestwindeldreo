import { readdir, readFile } from "node:fs/promises";
import { databaseConnection } from "./database.ts";
const sql = databaseConnection();
try {
    const directory = new URL("../supabase/migrations/", import.meta.url);
    const names = (await readdir(directory)).filter(name => name.endsWith("_portfolio_site_stats.sql")).sort();
    if (!names.length) throw new Error("Stats migration not found.");
    for (const name of names) {
        const migration = await readFile(new URL(name, directory), "utf8");
        await sql.begin(async transaction => { await transaction.unsafe(migration); });
    }
    const [counts] = await sql`select * from public.portfolio_stats_snapshot(null::uuid)`;
    console.log("Supabase stats schema ready:", counts);
} catch (error) {
    console.error("Supabase setup failed:", { code: (error as { code?: string }).code ?? "SETUP_ERROR" });
    process.exitCode = 1;
} finally { await sql.end({ timeout: 3 }); }
