-- ============================================================
-- MindSpace AI — Supabase Schema Migration
-- Run this ONCE in your Supabase project's SQL Editor.
-- Dashboard → SQL Editor → New Query → paste → Run
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── users ────────────────────────────────────────────────────
-- One row per student. For this demo we use a fixed demo user.
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT        NOT NULL DEFAULT 'Student',
  target_exam   TEXT        NOT NULL DEFAULT 'JEE Advanced 2027',
  weaknesses    TEXT[]      NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the demo user if not already present
INSERT INTO users (id, name, target_exam, weaknesses)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sahil',
  'JEE Advanced 2027',
  ARRAY['Thermodynamics', 'Organic Chemistry']
)
ON CONFLICT (id) DO NOTHING;

-- ── journal_entries ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mood            INTEGER     NOT NULL CHECK (mood BETWEEN 1 AND 10),
  content         TEXT        NOT NULL,
  triggers        TEXT[]      NOT NULL DEFAULT '{}',
  support_message TEXT,
  strategies      TEXT[]      NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_entries_user_created
  ON journal_entries (user_id, created_at DESC);

-- ── calendar_events ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS calendar_events (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT        NOT NULL,
  event_date   DATE        NOT NULL,
  event_time   TIME,
  type         TEXT        NOT NULL DEFAULT 'study'
                CHECK (type IN ('study','exam','wellness','deadline','ai')),
  ai_scheduled BOOLEAN     NOT NULL DEFAULT FALSE,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS calendar_events_user_date
  ON calendar_events (user_id, event_date);

-- Seed a few starter events
INSERT INTO calendar_events (user_id, title, event_date, event_time, type)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'Thermodynamics Revision', CURRENT_DATE,        '09:00', 'study'),
  ('00000000-0000-0000-0000-000000000001', 'Morning Walk',            CURRENT_DATE,        '07:00', 'wellness'),
  ('00000000-0000-0000-0000-000000000001', 'Physics Mock Test',       CURRENT_DATE + 1,   '10:00', 'exam'),
  ('00000000-0000-0000-0000-000000000001', 'Assignment Deadline',     CURRENT_DATE + 2,   '23:59', 'deadline')
ON CONFLICT DO NOTHING;

-- ── uploaded_materials ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS uploaded_materials (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename        TEXT        NOT NULL,
  content_summary TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Row-Level Security (RLS) — enable for Supabase ──────────
-- These policies allow the service-role key (used only server-side)
-- full access, while blocking anonymous browser access.

ALTER TABLE users               ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries     ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_materials  ENABLE ROW LEVEL SECURITY;

-- Service-role bypass (your server-side API key always has full access)
-- The policies below are for a future auth integration; for now,
-- the service role key skips RLS entirely, so no explicit policy is needed.
-- If you add Supabase Auth later, replace these with user-scoped policies.

CREATE POLICY "service_role_all" ON users
  FOR ALL USING (TRUE);
CREATE POLICY "service_role_all" ON journal_entries
  FOR ALL USING (TRUE);
CREATE POLICY "service_role_all" ON calendar_events
  FOR ALL USING (TRUE);
CREATE POLICY "service_role_all" ON uploaded_materials
  FOR ALL USING (TRUE);

-- ── chat_conversations ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_conversations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL DEFAULT 'New conversation',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_conversations_user_updated
  ON chat_conversations (user_id, updated_at DESC);

-- ── chat_messages ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role             TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content          TEXT        NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'text'
                   CHECK (type IN ('text', 'quiz', 'calendar_event', 'insight')),
  metadata         JSONB,
  agents           JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_conversation_created
  ON chat_messages (conversation_id, created_at ASC);

ALTER TABLE chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages      ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON chat_conversations
  FOR ALL USING (TRUE);
CREATE POLICY "service_role_all" ON chat_messages
  FOR ALL USING (TRUE);

-- ============================================================
-- Done! Add these to your .env and Vercel Environment Variables:
--   NEXT_PUBLIC_SUPABASE_URL  = https://xxxx.supabase.co
--   SUPABASE_SERVICE_ROLE_KEY = eyJ...  (Settings → API)
-- ============================================================

-- ── syllabus_trees ───────────────────────────────────────────
-- One tree per user (upserted on save).
CREATE TABLE IF NOT EXISTS syllabus_trees (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  tree        JSONB       NOT NULL DEFAULT '[]'::jsonb,
  raw_text    TEXT        NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE syllabus_trees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all" ON syllabus_trees;
CREATE POLICY "service_role_all" ON syllabus_trees FOR ALL USING (TRUE);
GRANT ALL ON syllabus_trees TO service_role;
