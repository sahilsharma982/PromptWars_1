/**
 * utils/mockGenerator.ts — MindSpace AI · Demo Data Generator
 *
 * Provides high-fidelity demo outputs for all major features.
 * Used when the live AI model is unavailable (no API key) or
 * when judges want to preview UI without making real API calls.
 *
 * Each function returns the same shape as its corresponding API route,
 * so components work identically in demo mode and production mode.
 */

import type { HiveResponse, AnalysisResult, SyllabusNode } from '../types';

// ── Hive (Multi-agent chat) ────────────────────────────────────────────────────

const DEMO_HIVE_RESPONSES: Record<string, HiveResponse> = {
  quiz: {
    reply: "Here's a quick quiz on Newton's Laws:",
    type: 'quiz',
    metadata: {
      topic: 'Mechanics',
      question: 'A 5 kg block is pushed with a force of 20 N. What is its acceleration (ignoring friction)?',
      options: ['A) 2 m/s²', 'B) 4 m/s²', 'C) 5 m/s²', 'D) 10 m/s²'],
      correct: 'B',
      explanation: "By Newton's Second Law: a = F/m = 20/5 = 4 m/s²",
    },
    agents_invoked: [
      { key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Generated Physics MCQ from Newton\'s Second Law topic.' },
    ],
    model: 'demo-mock',
  },

  schedule: {
    reply: 'Done! I\'ve added a 2-hour Physics revision session to your calendar for tomorrow at 10 AM.',
    type: 'calendar_event',
    metadata: {
      title: '2hr Physics Revision',
      date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      event_time: '10:00',
      duration_hours: 2,
      subject: 'Physics',
    },
    agents_invoked: [
      { key: 'scheduler', name: 'Scheduler Agent', emoji: '📅', summary: 'Created time-blocked study session for Physics.' },
    ],
    model: 'demo-mock',
  },

  wellness: {
    reply: "I hear you — burnout is very real and more common in exam prep than you might think. Your body is telling you to rest.\n\nHere's what I recommend:\n1. Take a full 24-hour break from studying this weekend. Rest is part of performance.\n2. Try a 10-minute mindful walk — physical movement is the fastest burnout antidote.\n3. Lower tomorrow's study target by 40%. Small wins rebuild motivation better than heroic sessions.\n\nYou've come a long way. Let's pace wisely. 💙",
    type: 'text',
    agents_invoked: [
      { key: 'wellness', name: 'Wellness Agent', emoji: '🌿', summary: 'Detected burnout signals. Provided recovery protocol.' },
      { key: 'motivator', name: 'Motivator Agent', emoji: '🔥', summary: 'Reinforced progress and self-compassion framing.' },
    ],
    model: 'demo-mock',
  },

  insight: {
    reply: "Here's your weekly performance snapshot:",
    type: 'insight',
    metadata: {
      label: 'Avg Mood this week',
      value: '6.8 / 10',
      trend: 'improving',
      topTrigger: 'Mock Test Anxiety',
      suggestedAction: 'Schedule one low-stakes practice quiz per day to desensitise test anxiety.',
    },
    agents_invoked: [
      { key: 'analyst', name: 'Analyst Agent', emoji: '📊', summary: 'Analysed 7 journal entries and 3 calendar events for mood trends.' },
    ],
    model: 'demo-mock',
  },
};

/**
 * Returns a demo Hive response based on message keyword matching.
 * Simulates the multi-agent orchestration pipeline without API calls.
 */
export function generateMockHiveResponse(message: string): HiveResponse {
  const lower = message.toLowerCase();
  if (lower.includes('quiz') || lower.includes('test me') || lower.includes('mcq')) return DEMO_HIVE_RESPONSES.quiz;
  if (lower.includes('schedule') || lower.includes('add') || lower.includes('calendar')) return DEMO_HIVE_RESPONSES.schedule;
  if (lower.includes('burnout') || lower.includes('tired') || lower.includes('stress') || lower.includes('help')) return DEMO_HIVE_RESPONSES.wellness;
  if (lower.includes('how am i') || lower.includes('week') || lower.includes('trend') || lower.includes('insight')) return DEMO_HIVE_RESPONSES.insight;
  // Generic fallback
  return {
    reply: "I'm here to help! I can quiz you on any topic, schedule study sessions, check your mood trends, or provide emotional support. What would you like?",
    type: 'text',
    agents_invoked: [
      { key: 'academic', name: 'Academic Agent', emoji: '📚', summary: 'Provided general guidance.' },
    ],
    model: 'demo-mock',
  };
}

// ── Journal Analysis ───────────────────────────────────────────────────────────

/**
 * Returns a demo journal analysis response.
 * Mirrors the shape of /api/analyze POST response.
 */
export function generateMockAnalysis(mood: number, journal: string): Omit<AnalysisResult, 'entry' | 'persisted'> {
  const isLowMood = mood <= 4;
  const isMidMood = mood >= 5 && mood <= 6;

  return {
    triggers: isLowMood
      ? ['Exam Pressure', 'Sleep Deprivation', 'Self-Doubt']
      : isMidMood
      ? ['Mock Test Anxiety', 'Peer Comparison']
      : ['Time Management'],
    supportMessage: isLowMood
      ? "It sounds like you're carrying a heavy load right now. What you're feeling is completely valid — exam prep is genuinely hard. Please be kind to yourself tonight."
      : isMidMood
      ? "You're doing better than you think. A few rough patches don't define your trajectory. Let's focus on the small wins."
      : "Really glad to hear you're finding your stride! Consistent effort like this is exactly what compounds into breakthroughs.",
    strategies: isLowMood
      ? ['Take a full rest day this week — it\'s not wasted time', '4-7-8 breathing before bed (4 in, 7 hold, 8 out)', 'Talk to one trusted friend about how you\'re feeling']
      : isMidMood
      ? ['Replace 1 comparison thought with a progress thought daily', 'Review one topic you know well before a hard session']
      : ['Maintain momentum with a weekly review on Sundays', 'Share your progress — teaching others cements learning'],
  };
}

// ── Syllabus Organizer ────────────────────────────────────────────────────────

/** Demo syllabus tree for JEE Physics + Maths — used by the "Try demo" button. */
export const DEMO_SYLLABUS_TREE: SyllabusNode[] = [
  {
    id: 'physics',
    name: 'Physics — JEE Advanced 2027',
    type: 'subject',
    description: 'Complete JEE Advanced Physics syllabus',
    children: [
      {
        id: 'mechanics',
        name: 'Mechanics',
        type: 'unit',
        description: 'Foundation of classical physics',
        estimatedHours: 40,
        children: [
          {
            id: 'kinematics',
            name: 'Kinematics',
            type: 'chapter',
            weight: 'high',
            difficulty: 'medium',
            estimatedHours: 8,
            children: [
              { id: 'motion-1d', name: 'Motion in a Straight Line', type: 'topic', weight: 'high', difficulty: 'easy', estimatedHours: 3 },
              { id: 'projectile', name: 'Projectile Motion', type: 'topic', weight: 'high', difficulty: 'medium', estimatedHours: 3 },
              { id: 'circular', name: 'Circular Motion', type: 'topic', weight: 'medium', difficulty: 'medium', estimatedHours: 2 },
            ],
          },
          {
            id: 'laws-of-motion',
            name: "Newton's Laws of Motion",
            type: 'chapter',
            weight: 'high',
            difficulty: 'medium',
            estimatedHours: 10,
            children: [
              { id: 'newton-1', name: 'First Law & Inertia', type: 'topic', weight: 'medium', difficulty: 'easy', estimatedHours: 2 },
              { id: 'newton-2', name: 'Second Law & F=ma', type: 'topic', weight: 'high', difficulty: 'medium', estimatedHours: 4 },
              { id: 'friction', name: 'Friction & Constraint Motion', type: 'topic', weight: 'high', difficulty: 'hard', estimatedHours: 4 },
            ],
          },
        ],
      },
      {
        id: 'thermodynamics',
        name: 'Thermodynamics',
        type: 'unit',
        description: 'Heat, energy, and entropy',
        estimatedHours: 20,
        children: [
          {
            id: 'kinetic-theory',
            name: 'Kinetic Theory of Gases',
            type: 'chapter',
            weight: 'high',
            difficulty: 'medium',
            estimatedHours: 8,
            children: [
              { id: 'ideal-gas', name: 'Ideal Gas Law & PV=nRT', type: 'topic', weight: 'high', difficulty: 'easy', estimatedHours: 3 },
              { id: 'degrees', name: 'Degrees of Freedom & Equipartition', type: 'topic', weight: 'medium', difficulty: 'hard', estimatedHours: 3 },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'maths',
    name: 'Mathematics — JEE Advanced 2027',
    type: 'subject',
    description: 'Complete JEE Advanced Maths syllabus',
    children: [
      {
        id: 'calculus',
        name: 'Calculus',
        type: 'unit',
        estimatedHours: 45,
        children: [
          {
            id: 'limits',
            name: 'Limits, Continuity & Differentiability',
            type: 'chapter',
            weight: 'high',
            difficulty: 'hard',
            estimatedHours: 12,
            children: [
              { id: 'limits-topics', name: 'Standard Limits & L\'Hôpital', type: 'topic', weight: 'high', difficulty: 'medium', estimatedHours: 5 },
              { id: 'continuity', name: 'Continuity & Discontinuities', type: 'topic', weight: 'medium', difficulty: 'medium', estimatedHours: 4 },
            ],
          },
          {
            id: 'integration',
            name: 'Integration',
            type: 'chapter',
            weight: 'high',
            difficulty: 'hard',
            estimatedHours: 18,
            children: [
              { id: 'indefinite', name: 'Indefinite Integration', type: 'topic', weight: 'high', difficulty: 'hard', estimatedHours: 8 },
              { id: 'definite', name: 'Definite Integration & Properties', type: 'topic', weight: 'high', difficulty: 'hard', estimatedHours: 7 },
            ],
          },
        ],
      },
    ],
  },
];
