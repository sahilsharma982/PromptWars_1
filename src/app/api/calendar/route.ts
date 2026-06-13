import { NextResponse } from 'next/server';
import {
  getCalendarEvents,
  createCalendarEvent,
  deleteCalendarEvent,
  DEMO_USER_ID,
  type EventType,
} from '@/lib/db';

// GET /api/calendar — fetch all events for the demo user
export async function GET() {
  try {
    const events = await getCalendarEvents(DEMO_USER_ID);
    return NextResponse.json({ events });
  } catch (error: any) {
    console.error('[Calendar API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/calendar — create a new event
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, event_date, event_time, type, ai_scheduled, note } = body;

    if (!title?.trim() || !event_date) {
      return NextResponse.json({ error: 'title and event_date are required' }, { status: 400 });
    }

    const created = await createCalendarEvent({
      user_id: DEMO_USER_ID,
      title: title.trim(),
      event_date,
      event_time: event_time || null,
      type: (type as EventType) || 'study',
      ai_scheduled: ai_scheduled ?? false,
      note: note || null,
    });

    if (!created) {
      // Supabase not configured — return the body as-is so the UI still works
      return NextResponse.json({
        event: {
          id: `local-${Date.now()}`,
          user_id: DEMO_USER_ID,
          title,
          event_date,
          event_time: event_time || null,
          type: type || 'study',
          ai_scheduled: ai_scheduled ?? false,
          note: note || null,
        },
        persisted: false,
      });
    }

    return NextResponse.json({ event: created, persisted: true });
  } catch (error: any) {
    console.error('[Calendar API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/calendar?id=xxx
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const ok = await deleteCalendarEvent(id);
    return NextResponse.json({ deleted: ok });
  } catch (error: any) {
    console.error('[Calendar API] DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
