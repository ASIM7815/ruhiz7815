import { NextResponse } from "next/server";
import { Storage } from "@google-cloud/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const results: any = {
    timestamp: new Date().toISOString(),
    checks: {},
  };

  // Check 1: Environment variables
  results.checks.envVars = {
    GCS_BUCKET_NAME: process.env.GCS_BUCKET_NAME ? "✓ Set" : "✗ Missing",
    GCS_CREDENTIALS: process.env.GCS_CREDENTIALS ? "✓ Set" : "✗ Missing",
    credentialsLength: process.env.GCS_CREDENTIALS?.length || 0,
  };

  // Check 2: Parse credentials
  try {
    if (process.env.GCS_CREDENTIALS) {
      const creds = JSON.parse(process.env.GCS_CREDENTIALS);
      results.checks.credentials = {
        status: "✓ Valid JSON",
        projectId: creds.project_id,
        clientEmail: creds.client_email,
        hasPrivateKey: !!creds.private_key,
        privateKeyFormat: creds.private_key?.substring(0, 30) + "...",
      };
    } else {
      results.checks.credentials = { status: "✗ No credentials" };
    }
  } catch (error) {
    results.checks.credentials = {
      status: "✗ Invalid JSON",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  // Check 3: Initialize Storage
  try {
    let storage: Storage;
    
    if (process.env.GCS_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GCS_CREDENTIALS);
      
      // Fix private key format
      if (credentials.private_key && credentials.private_key.includes('\\n')) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }
      
      storage = new Storage({ 
        credentials,
        projectId: credentials.project_id 
      });
      
      results.checks.storageInit = {
        status: "✓ Storage initialized",
        projectId: credentials.project_id,
      };
    } else {
      throw new Error("No credentials available");
    }

    // Check 4: Test bucket access
    const bucketName = process.env.GCS_BUCKET_NAME || "ruhiz";
    const bucket = storage.bucket(bucketName);
    
    try {
      const [exists] = await bucket.exists();
      results.checks.bucketAccess = {
        status: exists ? "✓ Bucket exists" : "✗ Bucket not found",
        bucketName,
      };

      if (exists) {
        // Try to get bucket metadata
        const [metadata] = await bucket.getMetadata();
        results.checks.bucketMetadata = {
          status: "✓ Can read metadata",
          location: metadata.location,
          storageClass: metadata.storageClass,
        };
      }
    } catch (bucketError) {
      results.checks.bucketAccess = {
        status: "✗ Bucket access failed",
        bucketName,
        error: bucketError instanceof Error ? bucketError.message : String(bucketError),
      };
    }

  } catch (error) {
    results.checks.storageInit = {
      status: "✗ Failed to initialize",
      error: error instanceof Error ? error.message : String(error),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
