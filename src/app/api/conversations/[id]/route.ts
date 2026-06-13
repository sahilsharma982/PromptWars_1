import { NextResponse } from 'next/server';
import {
  getConversation,
  getMessages,
  updateConversationTitle,
  DEMO_USER_ID,
} from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/conversations/[id] — fetch conversation + messages
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const [conversation, messages] = await Promise.all([
      getConversation(id, DEMO_USER_ID),
      getMessages(id),
    ]);

    if (!conversation && messages.length === 0) {
      return NextResponse.json({ conversation: null, messages: [], persisted: false });
    }

    return NextResponse.json({
      conversation: conversation ?? {
        id,
        user_id: DEMO_USER_ID,
        title: 'New conversation',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      messages,
      persisted: !!conversation,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Conversations API] GET [id] error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/conversations/[id] — update title
export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const { title } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const ok = await updateConversationTitle(id, DEMO_USER_ID, title.trim());
    return NextResponse.json({ updated: ok, persisted: ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Conversations API] PATCH error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
