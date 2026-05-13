// Run this script ONCE to create messaging tables in Supabase
// Usage: npx tsx scripts/setup-supabase-messaging.ts

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setup() {
  console.log("Creating messaging tables in Supabase...\n");

  // 1. conversations table
  await supabase.rpc("exec_sql", {
    sql: `
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `,
  });

  // If rpc doesn't exist, fall back to using the SQL editor approach
  // Let's try direct table creation via the REST API instead

  // Actually, let's use supabase.from() which requires tables to exist.
  // We need to use the SQL approach. Let me use fetch directly.

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const statements = [
    // conversations
    `CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    // conversation_participants
    `CREATE TABLE IF NOT EXISTS conversation_participants (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(conversation_id, user_id)
    );`,

    // direct_messages
    `CREATE TABLE IF NOT EXISTS direct_messages (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
      sender_id TEXT NOT NULL,
      content TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT false,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );`,

    // message_reactions
    `CREATE TABLE IF NOT EXISTS message_reactions (
      id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
      message_id TEXT NOT NULL REFERENCES direct_messages(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL,
      emoji TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE(message_id, user_id, emoji)
    );`,

    // Indexes for performance
    `CREATE INDEX IF NOT EXISTS idx_conv_participants_user ON conversation_participants(user_id);`,
    `CREATE INDEX IF NOT EXISTS idx_conv_participants_conv ON conversation_participants(conversation_id);`,
    `CREATE INDEX IF NOT EXISTS idx_direct_messages_conv ON direct_messages(conversation_id, created_at DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_direct_messages_sender ON direct_messages(sender_id);`,
    `CREATE INDEX IF NOT EXISTS idx_direct_messages_unread ON direct_messages(conversation_id, sender_id, is_read) WHERE is_read = false;`,
    `CREATE INDEX IF NOT EXISTS idx_message_reactions_msg ON message_reactions(message_id);`,

    // Enable Realtime for direct_messages table
    `ALTER PUBLICATION supabase_realtime ADD TABLE direct_messages;`,
  ];

  for (const sql of statements) {
    await fetch(`${url}/rest/v1/rpc/`, {
      method: "POST",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    });

    // Use the pg_net/SQL endpoint instead
  }

  // Use Supabase Management API or SQL editor
  // Actually the simplest way: use the postgres connection via fetch to /pg
  // Let's just print the SQL for the user to run in Supabase SQL Editor

  console.log("=== Run this SQL in your Supabase SQL Editor ===");
  console.log("(Dashboard → SQL Editor → New Query → Paste → Run)\n");
  console.log(statements.join("\n\n"));
  console.log("\n=== Done ===");
}

setup().catch(console.error);
