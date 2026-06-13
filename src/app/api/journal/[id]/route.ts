import { NextResponse } from 'next/server';
import { getJournalEntry, DEMO_USER_ID } from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/journal/[id] — fetch a single entry
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const entry = await getJournalEntry(DEMO_USER_ID, id);
    if (!entry) {
      return NextResponse.json({ entry: null }, { status: 404 });
    }
    return NextResponse.json({ entry });
  } catch (error: any) {
    console.error('[Journal API] GET [id] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
