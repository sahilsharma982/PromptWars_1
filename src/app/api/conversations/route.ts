import { NextResponse } from 'next/server';
import {
  getConversations,
  createConversation,
  DEMO_USER_ID,
} from '@/lib/db';

// GET /api/conversations — list conversations
export async function GET() {
  try {
    const conversations = await getConversations(DEMO_USER_ID);
    return NextResponse.json({ conversations, persisted: !!process.env.NEXT_PUBLIC_SUPABASE_URL });
  } catch (error: any) {
    console.error('[Conversations API] GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/conversations — create a new conversation
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, id } = body as { title?: string; id?: string };

    const created = await createConversation(
      DEMO_USER_ID,
      title?.trim() || 'New conversation',
      id,
    );

    if (!created) {
      const now = new Date().toISOString();
      const fallbackId = id || crypto.randomUUID();
      return NextResponse.json({
        conversation: {
          id: fallbackId,
          user_id: DEMO_USER_ID,
          title: title?.trim() || 'New conversation',
          created_at: now,
          updated_at: now,
        },
        persisted: false,
      });
    }

    return NextResponse.json({ conversation: created, persisted: true });
  } catch (error: any) {
    console.error('[Conversations API] POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
