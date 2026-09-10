import postgres from "postgres";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) { console.error("DATABASE_URL missing"); process.exit(1); }

const client = postgres(url);

async function main() {
  try {
    // Try querying restaurants table
    const result = await client`SELECT * FROM public.restaurants LIMIT 1`;
    console.log("restaurants result:", JSON.stringify(result, null, 2));
  } catch (e: any) {
    console.error("=== RAW ERROR ===");
    console.error("message:", e.message);
    console.error("code:", e.code);
    console.error("detail:", e.detail);
    console.error("hint:", e.hint);
    console.error("position:", e.position);
  } finally {
    await client.end();
  }
}

main();
