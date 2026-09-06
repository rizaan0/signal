import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnv() {
  const text = readFileSync(resolve(".env"), "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const i = line.indexOf("=");
    env[line.slice(0, i)] = line.slice(i + 1);
  }
  return env;
}

const env = { ...process.env, ...loadEnv() };
const sql = readFileSync(resolve("supabase/setup.sql"), "utf8");
const url = env.SUPABASE_URL;
const ref = url ? new URL(url).hostname.split(".")[0] : "";

if (env.SUPABASE_ACCESS_TOKEN && ref) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );
  const body = await res.text();
  if (!res.ok) {
    console.error("Management API failed:", res.status, body.slice(0, 400));
    process.exit(1);
  }
  console.log("Applied schema via Supabase Management API.");
  process.exit(0);
}

if (env.DATABASE_URL) {
  const { default: pg } = await import("pg");
  const client = new pg.Client({ connectionString: env.DATABASE_URL });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("Applied schema via DATABASE_URL.");
  process.exit(0);
}

console.error(
  [
    "Cannot apply SQL with only SUPABASE_URL + service role.",
    "Add one of these to .env and re-run: node scripts/apply-migrations.mjs",
    "",
    "  SUPABASE_ACCESS_TOKEN  (https://supabase.com/dashboard/account/tokens)",
    "  DATABASE_URL           (Project Settings → Database → URI)",
    "",
    `Or paste supabase/setup.sql here:`,
    `https://supabase.com/dashboard/project/${ref}/sql/new`,
  ].join("\n"),
);
process.exit(1);
