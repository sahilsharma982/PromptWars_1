# Project Parameters & Rubric Alignment

This document outlines the design parameters of **MindSpace AI** and explains how the system implements the 6 evaluation metrics specified in the PromptWars rubric.

---

## 🚀 1. Problem Statement Alignment (High Impact)
*Targets the core challenge, user needs & objectives.*

*   **Core Problem**: High-stakes exam students (JEE/NEET/UPSC/CAT) suffer from compounded academic stress, unstructured study, poor sleep hygiene, and burnout — with no single tool that addresses the whole picture.
*   **Multi-Agent Hive Architecture**: Every user message is intelligently routed by an Orchestrator to a committee of 5 specialist agents — Academic, Wellness, Scheduler, Motivator, and Analyst — that run in parallel and synthesize a single, context-aware response.
*   **Multimodal Document Input**: Students upload their syllabus (PDF/TXT drag-and-drop) to the Syllabus Organizer. The AI uses `callModel` to parse raw text and emit a typed `SyllabusNode[]` tree with subject → unit → chapter → topic hierarchy, estimated study hours, and exam weight tags.
*   **Wellness & Device Integration**: The Integrations page connects Apple Watch and Fitbit to pull sleep stages (deep/REM/light), heart rate, and activity rings. The Wellness Agent summarises 7-night sleep trends and flags risk factors correlated with cognitive decline.
*   **Persistent Context Engine**: All user data (journal entries, calendar events, chat history, mood scores) is persisted in Supabase and fed into every Hive prompt via `buildStudentContext()`, ensuring responses are personalised rather than generic.

---

## 🎨 2. Code Quality (High Impact)
*Clean, readable & well-structured code.*

*   **Strict TypeScript**: Every domain entity is declared in `src/types/index.ts` — `UserProfile`, `JournalEntry`, `CalendarEvent`, `ChatMessage`, `SyllabusNode`, `HiveRequest`, `HiveResponse`, `StudentContext`. No `any` usage in production paths.
*   **Modular Architecture**: Clear separation of concerns:
    *   `src/lib/modelRouter.ts` — Provider-agnostic AI client (NIM / Gemini / OpenAI), tiered by complexity (0=light, 1=standard, 2=heavy).
    *   `src/lib/db.ts` — Typed Supabase helpers with graceful degradation when DB is unconfigured.
    *   `src/lib/chatStorage.ts` — Client-side localStorage persistence layer for offline fallback.
    *   `src/app/api/` — Thin, focused API routes: `/hive`, `/analyze`, `/calendar`, `/syllabus`, `/conversations`, `/migrate`.
    *   `src/components/` — Reusable UI: `CompanionChat`, `NavBar`, plus page-scoped components.
*   **Consistent Error Handling**: All API routes wrap handlers in try/catch, return typed error JSON, and log with `[module]` prefixes for easy debugging.
*   **Zero Magic Numbers**: Model tiers, user IDs, and storage keys are named constants.

---

## 🔒 3. Security (Medium Impact)
*Safe practices, avoids common vulnerabilities.*

*   **API Key Protection**: All LLM calls (`callModel`) are made exclusively inside Next.js API routes on the server. Keys (`GOOGLE_GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) are never shipped to the client bundle.
*   **Service Role Isolation**: The Supabase admin client (`getAdminClient()`) uses the `SERVICE_ROLE_KEY` only in server-side `src/lib/db.ts`. The client-side `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` has no write permissions by default.
*   **Input Validation**: File uploads (syllabus, journal) are validated before being forwarded to the AI — content is sliced to `12,000` characters to prevent prompt injection or DoS via oversized inputs (`/api/syllabus` line 55).
*   **No Persistent File Storage**: Uploaded documents are read as text in-memory, passed to the serverless route, and discarded. No files are written to disk or exposed publicly.

---

## ⚡ 4. Efficiency (Medium Impact)
*Optimal use of time & memory.*

*   **Parallel Agent Execution**: Specialist agents in the Hive run concurrently via `Promise.all`, reducing wall-clock latency compared to sequential LLM calls.
*   **Tiered Model Routing**: `modelRouter.ts` assigns complexity tiers to every call — the Orchestrator uses `tier: 2` (heavy), most agents `tier: 1` (standard), and the Synthesizer `tier: 0` (light) — minimising token spend without sacrificing quality.
*   **Optimistic UI Updates**: Calendar events, journal saves, and chat messages are rendered immediately in local state; Supabase persistence happens in the background without blocking the UI.
*   **Context Caching**: `buildStudentContext()` batches all Supabase reads into a single `Promise.all`, eliminating N+1 DB queries per request.
*   **localStorage Fallback**: Chat sessions, calendar events, and syllabus trees are mirrored to `localStorage` so the app is fully functional even when the database is unavailable — critical for demo environments.
*   **Scrollbar-Gutter Stability**: `html { overflow-y: scroll; scrollbar-gutter: stable; }` eliminates layout-shift jitter when navigating between pages — zero Cumulative Layout Shift (CLS).

---

## 🧪 5. Testing (Low Impact)
*Easily testable & maintainable code.*

*   **Zero-Config Demo Mode**: If Supabase tables are absent or the DB is unconfigured, every `db.ts` function returns an empty-safe default (`[]` or `null`) and logs a `[db]` warning. The full UI renders with `localStorage`-backed data — judges can test 100% of features without running `database/schema.sql`.
*   **Demo Data Pre-seeded**: The Calendar, Integrations, and Syllabus pages all ship with realistic demo data (7-night sleep history, JEE syllabus, calendar events) visible immediately on first visit.
*   **`/api/migrate` Endpoint**: A single `GET /api/migrate` call applies `database/schema.sql` to Supabase via the Management API — one-click database bootstrap for any reviewer.
*   **Companion "Try Demo" Button**: The Syllabus Organizer includes a "Try demo" button that pre-fills a complete JEE Physics + Mathematics syllabus, letting judges test AI parsing instantly without typing.

---

## ♿ 6. Accessibility (Low Impact)
*Usable for diverse users & environments.*

*   **Semantic HTML**: All pages use `<h1>` / `<h2>` / `<section>` / `<nav>` / `<main>` / `<form>` correctly. Interactive elements are `<button>` or `<a>` — never `<div onClick>`.
*   **ARIA Labels**: Key controls carry descriptive `aria-label` and `title` attributes (e.g. "Send message", "Delete conversation", "Collapse sidebar"). Toggle switches use `role="switch"` and `aria-checked`.
*   **Keyboard Navigation**: All modals, forms, and dropdowns are reachable via Tab. Keyboard shortcuts are documented inline: ⌘K (focus chat), ⌘N (new chat), Enter (send), Shift+Enter (new line).
*   **Focus States**: Inputs use `focus-within:border-[#27272A]` rings. Buttons never suppress `:focus-visible`.
*   **Responsive Layout**: Every page uses CSS Grid + Flexbox with `sm:` / `lg:` breakpoints. The companion sidebar collapses to icon-strip on small screens. Works from 320 px mobile to 1440 px desktop.
*   **Reduced Motion**: Framer Motion animations use `duration: 0.2–0.35s` easing curves that respect `prefers-reduced-motion` where supported by the library.
