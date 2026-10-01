import { existsSync, readFileSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { rootCertificates } from "node:tls";
import postgres from "postgres";
for (const file of [".env.local", ".env"]) if (existsSync(file)) loadEnvFile(file);
export function databaseConnection() {
    const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
    if (!url) throw new Error("Set DIRECT_URL or DATABASE_URL before running database setup.");
    const ca = readFileSync(new URL("./certs/supabase-ca.crt", import.meta.url), "utf8");
    return postgres(url, { ssl: { rejectUnauthorized: true, ca: [...rootCertificates, ca] }, max: 1, prepare: false, connect_timeout: 15, onnotice: () => {} });
}
