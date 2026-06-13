import { NextResponse } from 'next/server';
import {
  saveMessage,
  touchConversation,
  updateConversationTitle,
  getConversation,
  DEMO_USER_ID,
  type MessageType,
} from '@/lib/db';

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/conversations/[id]/messages — append a message
export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { role, content, type, metadata, agents, messageId, title } = body as {
      role: 'user' | 'assistant';
      content: string;
      type?: MessageType;
      metadata?: Record<string, unknown> | null;
      agents?: { key: string; name: string; emoji: string; summary: string }[];
      messageId?: string;
      title?: string;
    };

    if (!role || !content?.trim()) {
      return NextResponse.json({ error: 'role and content are required' }, { status: 400 });
    }

    const saved = await saveMessage({
      id: messageId,
      conversation_id: id,
      role,
      content: content.trim(),
      type: type || 'text',
      metadata: metadata ?? null,
      agents: agents ?? undefined,
    });

    if (saved) {
      await touchConversation(id);
      if (title?.trim()) {
        const conv = await getConversation(id, DEMO_USER_ID);
        if (conv && (conv.title === 'New conversation' || !conv.title)) {
          await updateConversationTitle(id, DEMO_USER_ID, title.trim().slice(0, 80));
        }
      }
      return NextResponse.json({ message: saved, persisted: true });
    }

    return NextResponse.json({
      message: {
        id: messageId || crypto.randomUUID(),
        conversation_id: id,
        role,
        content: content.trim(),
        type: type || 'text',
        metadata: metadata ?? null,
        agents: agents ?? null,
        created_at: new Date().toISOString(),
      },
      persisted: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[Conversations API] POST messages error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
