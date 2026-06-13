/**
 * /api/syllabus/schedule
 *
 * POST — given a syllabus tree + study preferences, the AI generates a
 *        sequenced study plan and bulk-creates calendar events.
 *
 * Body:
 *   tree        SyllabusNode[]   — the organized syllabus tree
 *   startDate   string           — 'YYYY-MM-DD' first study day
 *   examDate    string           — 'YYYY-MM-DD' exam / deadline
 *   hoursPerDay number           — daily study hours available (1-12)
 *   startTime   string           — 'HH:MM' preferred session start time
 *   daysOff     number[]         — days of week to skip: 0=Sun,6=Sat (default: [0])
 */

import { NextRequest, NextResponse } from 'next/server';
import { callModel } from '@/lib/modelRouter';
import { createCalendarEvent, DEMO_USER_ID } from '@/lib/db';
import type { SyllabusNode } from '@/types';

// ── Flatten tree into ordered topic list ───────────────────────────────────────

interface FlatTopic {
  name: string;
  subject: string;
  weight: 'high' | 'medium' | 'low';
  difficulty: 'easy' | 'medium' | 'hard';
  estimatedHours: number;
}

function flattenTree(nodes: SyllabusNode[], subject = ''): FlatTopic[] {
  const out: FlatTopic[] = [];
  for (const n of nodes) {
    const sub = n.type === 'subject' ? n.name : subject;
    if ((n.type === 'topic' || n.type === 'chapter') && (n.estimatedHours ?? 0) > 0) {
      out.push({
        name:           n.name,
        subject:        sub,
        weight:         n.weight    ?? 'medium',
        difficulty:     n.difficulty ?? 'medium',
        estimatedHours: n.estimatedHours ?? 1,
      });
    }
    if (n.children?.length) out.push(...flattenTree(n.children, sub));
  }
  return out;
}

// ── Working-day iterator (skip weekends or custom daysOff) ────────────────────

function addWorkingDays(start: Date, n: number, daysOff: number[]): Date {
  const d = new Date(start);
  let added = 0;
  while (added < n) {
    d.setDate(d.getDate() + 1);
    if (!daysOff.includes(d.getDay())) added++;
  }
  return d;
}

function workingDaysBetween(a: Date, b: Date, daysOff: number[]): number {
  let count = 0;
  const d = new Date(a);
  while (d < b) {
    if (!daysOff.includes(d.getDay())) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

function fmtDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

// ── AI-ordered topic sequence ──────────────────────────────────────────────────

interface ScheduledTopic {
  name: string;
  subject: string;
  date: string;        // YYYY-MM-DD
  durationHours: number;
  sessionNote: string;
}

async function buildSchedule(
  topics: FlatTopic[],
  startDate: Date,
  examDate: Date,
  hoursPerDay: number,
  daysOff: number[],
): Promise<ScheduledTopic[]> {
  const workDays = workingDaysBetween(startDate, examDate, daysOff);
  const totalHours = topics.reduce((a, t) => a + t.estimatedHours, 0);

  // For very large inputs, skip AI ordering and just sequence by weight (fast path)
  let ordered = topics;

  if (topics.length <= 30) {
    // Use AI to re-order topics logically (prerequisite-aware ordering)
    const topicList = topics
      .map((t, i) => `${i + 1}. [${t.subject}] ${t.name} (${t.estimatedHours}h, ${t.weight} weight, ${t.difficulty})`)
      .join('\n');

    try {
      const result = await callModel({
        userPrompt: `Reorder these study topics into the optimal learning sequence.
Prioritise: prerequisites first, high-weight topics before exam, easier topics early for momentum.
Return ONLY a JSON array of the topic numbers in the optimal order, e.g. [3,1,5,2,4].
Topics:\n${topicList}`,
        tier: 0,
        jsonMode: true,
        temperature: 0.1,
      });

      const raw = result.text.trim().replace(/^```json\s*/i, '').replace(/```\s*$/, '');
      const order: number[] = JSON.parse(raw);
      if (Array.isArray(order) && order.length === topics.length) {
        ordered = order.map(i => topics[i - 1]).filter(Boolean);
      }
    } catch {
      // Fall back to weight-based ordering if AI fails
      ordered = [...topics].sort((a, b) => {
        const w = { high: 0, medium: 1, low: 2 };
        return w[a.weight] - w[b.weight];
      });
    }
  }

  // Assign dates based on daily capacity
  const schedule: ScheduledTopic[] = [];
  let currentDate = new Date(startDate);
  let hoursUsedToday = 0;

  for (const topic of ordered) {
    let remaining = topic.estimatedHours;

    while (remaining > 0) {
      const available = hoursPerDay - hoursUsedToday;
      if (available <= 0) {
        // Move to next working day
        currentDate = addWorkingDays(currentDate, 0, daysOff);
        // advance one working day
        let next = new Date(currentDate);
        next.setDate(next.getDate() + 1);
        while (daysOff.includes(next.getDay())) next.setDate(next.getDate() + 1);
        currentDate = next;
        hoursUsedToday = 0;
        if (fmtDate(currentDate) >= fmtDate(examDate)) break; // don't schedule past exam
        continue;
      }

      const slot = Math.min(remaining, available, hoursPerDay);
      const dateStr = fmtDate(currentDate);

      // Merge with existing entry on same date if same topic
      const existing = schedule.find(s => s.date === dateStr && s.name === topic.name);
      if (existing) {
        existing.durationHours += slot;
      } else {
        schedule.push({
          name:          topic.name,
          subject:       topic.subject,
          date:          dateStr,
          durationHours: slot,
          sessionNote:   `${topic.subject} · ${topic.difficulty} · ${topic.weight} weight`,
        });
      }

      hoursUsedToday += slot;
      remaining -= slot;

      if (hoursUsedToday >= hoursPerDay) {
        let next = new Date(currentDate);
        next.setDate(next.getDate() + 1);
        while (daysOff.includes(next.getDay())) next.setDate(next.getDate() + 1);
        currentDate = next;
        hoursUsedToday = 0;
        if (fmtDate(currentDate) >= fmtDate(examDate)) break;
      }
    }

    if (fmtDate(currentDate) >= fmtDate(examDate)) break;
  }

  return schedule;
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      tree,
      startDate: startStr,
      examDate: examStr,
      hoursPerDay = 4,
      startTime   = '09:00',
      daysOff     = [0],       // Sunday off by default
    } = await req.json();

    if (!Array.isArray(tree) || tree.length === 0) {
      return NextResponse.json({ error: 'No syllabus tree provided' }, { status: 400 });
    }
    if (!startStr || !examStr) {
      return NextResponse.json({ error: 'startDate and examDate are required' }, { status: 400 });
    }

    const startDate = new Date(startStr);
    const examDate  = new Date(examStr);

    if (isNaN(startDate.getTime()) || isNaN(examDate.getTime())) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 });
    }
    if (startDate >= examDate) {
      return NextResponse.json({ error: 'startDate must be before examDate' }, { status: 400 });
    }

    // Flatten tree to list of topics
    const topics = flattenTree(tree as SyllabusNode[]);
    if (topics.length === 0) {
      return NextResponse.json({ error: 'No topics found in the syllabus tree' }, { status: 400 });
    }

    // Build the schedule
    const schedule = await buildSchedule(topics, startDate, examDate, Number(hoursPerDay), daysOff);
    if (schedule.length === 0) {
      return NextResponse.json({ error: 'Could not generate schedule — check dates' }, { status: 400 });
    }

    // Bulk-create calendar events (skip if DB not set up — return them anyway)
    const createdEvents = [];
    let persisted = 0;

    for (const session of schedule) {
      const event = await createCalendarEvent({
        user_id:      DEMO_USER_ID,
        title:        `📚 ${session.name}`,
        event_date:   session.date,
        event_time:   startTime,
        type:         'study',
        ai_scheduled: true,
        note:         `${session.durationHours}h · ${session.sessionNote}`,
      });
      if (event) persisted++;
      createdEvents.push(event ?? {
        id:          `local-${Date.now()}-${createdEvents.length}`,
        title:       `📚 ${session.name}`,
        event_date:  session.date,
        event_time:  startTime,
        type:        'study',
        ai_scheduled: true,
        note:        `${session.durationHours}h · ${session.sessionNote}`,
      });
    }

    // Also add the exam day as a deadline event
    await createCalendarEvent({
      user_id:      DEMO_USER_ID,
      title:        '🎯 Exam Day',
      event_date:   examStr,
      event_time:   '09:00',
      type:         'exam',
      ai_scheduled: true,
      note:         'Scheduled by Syllabus Organizer',
    }).catch(() => {});

    return NextResponse.json({
      events:    createdEvents,
      total:     createdEvents.length,
      persisted,
      topicCount: topics.length,
    });

  } catch (err: any) {
    console.error('[syllabus/schedule] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
