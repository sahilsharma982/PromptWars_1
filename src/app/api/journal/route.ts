/**
 * /api/journal — GET handler for the dashboard.
 * Returns the last 50 journal entries for the demo user.
 * Degrades gracefully when Supabase is unconfigured.
 */

import { NextResponse } from 'next/server';
import { getJournalEntries, DEMO_USER_ID } from '@/lib/db';

export async function GET() {
  try {
    const entries = await getJournalEntries(DEMO_USER_ID, 50);
    return NextResponse.json({ entries, count: entries.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[journal] GET error:', err);
    return NextResponse.json({ entries: [], count: 0, error: message });
  }
}
