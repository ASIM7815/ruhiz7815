// Script to verify storage environment variables for Cloudflare R2 uploads.
// Run locally: node verify-gcs-env.js

async function main() {
  const { config } = await import("dotenv");
  config({ path: ".env.local" });

  console.log("=== R2 Storage Environment Variables Check ===\n");

  const required = [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
  ];

  for (const name of required) {
    const value = process.env[name];
    console.log(`${name}: ${value ? "Set" : "Missing"}`);

    if (value && name !== "R2_SECRET_ACCESS_KEY") {
      console.log("  Value:", value);
    }
  }

  const bucketName = process.env.R2_BUCKET_NAME || "ruhiz";
  console.log(`R2_BUCKET_NAME: ${bucketName}`);

  const missing = required.filter((name) => !process.env[name]);
  if (missing.length > 0) {
    console.log("\nMissing required variables:", missing.join(", "));
    process.exitCode = 1;
  } else {
    console.log("\nConfiguration looks ready for /api/upload and /api/r2 routes.");
  }

  console.log("\n=== End Check ===");
}

main().catch((error) => {
  console.error("Failed to verify R2 env:", error);
  process.exitCode = 1;
});
