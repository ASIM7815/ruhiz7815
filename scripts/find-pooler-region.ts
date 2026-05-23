import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { Client } from "pg";

const regions = [
  "ap-south-1", // Mumbai (closer to India, very likely)
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "ca-central-1",
  "eu-west-1",
  "eu-west-2",
  "eu-west-3",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
  "ap-northeast-2",
  "ap-northeast-3",
  "sa-east-1",
];

const projectRef = "ybmauetbeakurugikmpb";
const password = "ABDULraouf%401";

async function testRegion(region: string) {
  const host = `aws-0-${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.${projectRef}:${password}@${host}:6543/postgres?pgbouncer=true`;
  
  console.log(`Testing region ${region} (${host})...`);
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS! Connected to pooler in region: ${region}\n`);
    await client.end();
    return true;
  } catch (err: any) {
    console.log(`❌ Failed for ${region}: ${err.message}`);
    return false;
  }
}

async function main() {
  for (const region of regions) {
    const success = await testRegion(region);
    if (success) {
      process.exit(0);
    }
  }
  console.log("\n❌ All regions failed.");
}

main().catch(console.error);
