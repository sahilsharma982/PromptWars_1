/**
 * scripts/migrate.mjs
 * Runs database/schema.sql against Supabase via the REST API.
 * Usage: node scripts/migrate.mjs
 */

import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });
const schema = readFileSync('database/schema.sql', 'utf8');

// Execute the whole schema as one RPC call using pg_query (available in Supabase)
// Supabase doesn't expose a raw SQL REST endpoint by default, but we can use
// the management API or chunk the statements.
// Strategy: use fetch against the /rest/v1/rpc endpoint with our SQL.
// Supabase allows executing arbitrary SQL via the pg_dump format only in Studio,
// so we use a helper RPC function approach.

// Alternative: use the Supabase Management API which DOES allow raw SQL.
const projectRef = url.replace('https://', '').replace('.supabase.co', '');

async function runMigration() {
  console.log(`🚀  Running migration on project: ${projectRef}`);
  console.log('📡  Using Supabase Management API...\n');

  // The Management API endpoint for running SQL
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  const res = await fetch(mgmtUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${key}`,
    },
    body: JSON.stringify({ query: schema }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn('⚠️  Management API failed (expected if using anon key), trying direct Supabase SQL...');
    console.warn('   Status:', res.status, text.slice(0, 200));
    
    // Fallback: try via fetch to the SQL endpoint directly
    await runViaRpc();
    return;
  }

  const data = await res.json();
  console.log('✅  Migration successful via Management API!');
  console.log(data);
}

async function runViaRpc() {
  // Split SQL into individual statements and run each via supabase-js
  // This works for CREATE TABLE and INSERT statements
  const stmts = schema
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'));

  console.log(`📋  Executing ${stmts.length} statements via RPC...\n`);

  for (let i = 0; i < stmts.length; i++) {
    const stmt = stmts[i];
    if (!stmt.replace(/--.*$/gm, '').trim()) continue;
    
    try {
      const { error } = await supabase.rpc('exec_sql', { sql: stmt + ';' });
      if (error && !error.message.includes('already exists')) {
        console.warn(`  ⚠️  Statement ${i + 1} warning: ${error.message.slice(0, 100)}`);
      } else {
        process.stdout.write(`  ✓ Statement ${i + 1}/${stmts.length}\r`);
      }
    } catch (e) {
      console.warn(`  ⚠️  Statement ${i + 1} error:`, e.message?.slice(0, 100));
    }
  }
  
  console.log('\n\n✅  Migration complete!');
  console.log('\n💡  If you see warnings, please run database/schema.sql manually in:');
  console.log('    Supabase Dashboard → SQL Editor → New Query → paste → Run');
}

runMigration().catch(console.error);
