#!/usr/bin/env node
/**
 * apply-schema.mjs
 * Applies database/schema.sql to Supabase via the PostgREST RPC endpoint.
 * Uses the service role key which bypasses RLS.
 *
 * Run: node scripts/apply-schema.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
const envPath = join(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx < 0) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = val;
}

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

// Read schema SQL
const schemaPath = join(__dirname, '..', 'database', 'schema.sql');
const sql = readFileSync(schemaPath, 'utf8');

console.log(`🔗  Connecting to ${SUPABASE_URL}`);
console.log(`📄  Schema: ${schemaPath}`);
console.log('');

// Split into individual statements (split on ; followed by whitespace/newline)
// Filter out empty and comment-only statements
const statements = sql
  .split(/;\s*\n/)
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

// Use the management API to execute SQL
// Supabase exposes a REST endpoint for SQL execution via the service role
async function executeSQL(query) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
    },
  });
  // The /rpc/ endpoint isn't right for raw SQL - use the pg endpoint
  return resp;
}

// Better: use Supabase's SQL endpoint via the management API
async function runRawSQL(sql) {
  // Extract project ref from URL: https://xxxx.supabase.co
  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  
  // Try the management API v1 SQL endpoint
  const resp = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  return resp;
}

// Actually, the simplest approach is to use Supabase JS client's
// raw query via the postgres.js REST endpoint or rpc
// Let's use the pg-meta endpoint that Supabase exposes
async function applyViaClient() {
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Split into individual statements and run them one by one
  // We'll use the rpc function if available, otherwise try direct
  let passed = 0;
  let failed = 0;
  const errors = [];

  // Run the entire schema as one block via a rpc call to pg-meta
  // Actually Supabase JS client doesn't expose raw SQL directly in v2
  // We use the /rest/v1/ endpoint trick with the pg-meta API

  const projectRef = SUPABASE_URL.replace('https://', '').replace('.supabase.co', '');
  
  // Try Supabase pg-meta (available on self-hosted, may work on cloud)
  const pgMetaResp = await fetch(
    `${SUPABASE_URL}/pg-meta/v0/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );
  
  if (pgMetaResp.ok) {
    const result = await pgMetaResp.json();
    console.log('✅  Schema applied via pg-meta!');
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  
  console.log(`pg-meta status: ${pgMetaResp.status}`);
  const pgMetaText = await pgMetaResp.text();
  console.log('pg-meta response:', pgMetaText.slice(0, 200));

  // Try the management API
  const mgmtResp = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    }
  );

  if (mgmtResp.ok) {
    const result = await mgmtResp.json();
    console.log('✅  Schema applied via Management API!');
    return;
  }
  
  console.log(`Management API status: ${mgmtResp.status}`);
  const mgmtText = await mgmtResp.text();
  console.log('Management API response:', mgmtText.slice(0, 300));

  // Last resort: try individual statements via PostgREST function calls
  console.log('\n⚠️  Direct SQL not available. Trying individual table creation...');
  
  // Check what tables already exist
  const { data: tables, error: tablesError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');
    
  if (tablesError) {
    console.error('Cannot query information_schema:', tablesError.message);
    console.log('\n📋  MANUAL STEP REQUIRED');
    console.log('Please run the SQL in database/schema.sql via:');
    console.log('  Supabase Dashboard → SQL Editor → paste → Run\n');
    return;
  }
  
  const existingTables = (tables || []).map(t => t.table_name);
  console.log('Existing tables:', existingTables.join(', ') || '(none)');
  
  const required = ['users', 'journal_entries', 'calendar_events', 'uploaded_materials', 'chat_conversations', 'chat_messages'];
  const missing = required.filter(t => !existingTables.includes(t));
  
  if (missing.length === 0) {
    console.log('✅  All required tables already exist!');
  } else {
    console.log(`❌  Missing tables: ${missing.join(', ')}`);
    console.log('\n📋  Please run database/schema.sql in the Supabase SQL Editor');
  }
}

applyViaClient().catch(console.error);
