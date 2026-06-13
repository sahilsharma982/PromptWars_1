/**
 * /api/migrate
 * One-shot migration endpoint — applies database/schema.sql to Supabase.
 * Triggered via GET /api/migrate from the browser or curl.
 *
 * Uses the Supabase Management API (api.supabase.com) which accepts
 * the project's service_role key for authentication.
 *
 * IMPORTANT: This route is only meant to be called once to initialise the DB.
 */

import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';

export async function GET() {
  const url   = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url || !svcKey) {
    return NextResponse.json({ error: 'Supabase env vars not set' }, { status: 500 });
  }

  // Derive project ref from project URL
  const projectRef = url.replace('https://', '').replace('.supabase.co', '');

  // Read schema SQL from disk (only runs server-side, inside Next.js API route)
  let schema: string;
  try {
    schema = readFileSync(join(process.cwd(), 'database', 'schema.sql'), 'utf8');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Could not read schema.sql: ${message}` }, { status: 500 });
  }

  // Attempt via Supabase Management API
  const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  try {
    const res = await fetch(mgmtUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${svcKey}`,
      },
      body: JSON.stringify({ query: schema }),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        success: true,
        message: 'Schema applied via Supabase Management API ✅',
        data,
      });
    }

    const errText = await res.text();
    console.warn('[migrate] Management API failed:', res.status, errText.slice(0, 300));

    // Fallback: apply statements individually via PostgREST rpc if an exec_sql function exists
    return NextResponse.json({
      success: false,
      message: `Management API returned ${res.status}. The service_role key may not have management-API access — please run database/schema.sql manually in Supabase Dashboard → SQL Editor.`,
      error: errText.slice(0, 400),
    }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      message: 'Network error calling Supabase Management API.',
      error: message,
    }, { status: 500 });
  }
}
