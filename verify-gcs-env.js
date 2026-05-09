// Script to verify GCS environment variables are correctly formatted
// Run this locally: node verify-gcs-env.js

require('dotenv').config({ path: '.env.local' });

console.log('=== GCS Environment Variables Check ===\n');

// Check if variables exist
const bucketName = process.env.GCS_BUCKET_NAME;
const credentials = process.env.GCS_CREDENTIALS;

console.log('1. GCS_BUCKET_NAME:', bucketName ? '✓ Set' : '✗ Missing');
console.log('   Value:', bucketName || 'N/A');

console.log('\n2. GCS_CREDENTIALS:', credentials ? '✓ Set' : '✗ Missing');

if (credentials) {
  console.log('   Length:', credentials.length, 'characters');
  
  // Try to parse JSON
  try {
    const parsed = JSON.parse(credentials);
    console.log('   ✓ Valid JSON');
    console.log('   Project ID:', parsed.project_id);
    console.log('   Client Email:', parsed.client_email);
    console.log('   Has Private Key:', parsed.private_key ? '✓ Yes' : '✗ No');
    
    if (parsed.private_key) {
      const hasBegin = parsed.private_key.includes('-----BEGIN PRIVATE KEY-----');
      const hasEnd = parsed.private_key.includes('-----END PRIVATE KEY-----');
      const hasNewlines = parsed.private_key.includes('\\n');
      
      console.log('   Private Key Format:');
      console.log('     - Has BEGIN marker:', hasBegin ? '✓' : '✗');
      console.log('     - Has END marker:', hasEnd ? '✓' : '✗');
      console.log('     - Has \\n characters:', hasNewlines ? '✓' : '✗');
    }
    
    console.log('\n✓ Configuration looks good!');
  } catch (error) {
    console.log('   ✗ Invalid JSON');
    console.log('   Error:', error.message);
    console.log('\n   First 100 characters:');
    console.log('   ', credentials.substring(0, 100));
  }
} else {
  console.log('   ✗ Not set - will try to use googlebucket.json file');
}

console.log('\n=== End Check ===');
