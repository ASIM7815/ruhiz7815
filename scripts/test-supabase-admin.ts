import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";

async function main() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    console.error("Missing supabase URL or service role key in env");
    process.exit(1);
  }

  console.log("Connecting to Supabase REST API...");
  console.log(`URL: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, serviceKey);

  console.log("Querying group_conversations...");
  const { data, error } = await supabase
    .from("group_conversations")
    .select("id, name")
    .limit(5);

  if (error) {
    console.error("❌ Supabase query failed:", error);
  } else {
    console.log("🎉 SUCCESS! Retrieved data from Supabase REST API:");
    console.log(data);
  }
}

main().catch(console.error);
