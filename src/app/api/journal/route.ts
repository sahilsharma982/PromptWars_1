import { NextResponse } from 'next/server';
import { getJournalEntries, DEMO_USER_ID } from '@/lib/db';

// GET /api/journal — list journal entries
export async function GET() {
  try {
    const entries = await getJournalEntries(DEMO_USER_ID);
    return NextResponse.json({ entries });
  } catch (error: any) {
    console.error('[Journal API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
