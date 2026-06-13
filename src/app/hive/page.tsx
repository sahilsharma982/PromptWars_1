"use client";

import { motion } from 'framer-motion';
import Link from 'next/link';
import { ArrowRight, Network } from 'lucide-react';

const AGENTS = [
  {
    key: 'router',
    name: 'Orchestrator',
    emoji: '🧠',
    role: 'Routes your message to the right specialists and synthesizes their answers.',
    color: '#27272A',
    bg: '#F4F4F5',
    connects: ['academic', 'wellness', 'scheduler', 'motivator', 'analyst'],
  },
  {
    key: 'academic',
    name: 'Academic Agent',
    emoji: '📚',
    role: 'Syllabus analysis, concept explanations, and interactive quiz generation.',
    color: '#1D4ED8',
    bg: '#EFF6FF',
  },
  {
    key: 'wellness',
    name: 'Wellness Agent',
    emoji: '🌿',
    role: 'Emotional support, burnout detection, and personalized coping strategies.',
    color: '#15803D',
    bg: '#F0FDF4',
  },
  {
    key: 'scheduler',
    name: 'Scheduler Agent',
    emoji: '📅',
    role: 'Calendar management, time-blocking, and intelligent study session creation.',
    color: '#D97757',
    bg: '#FFF7ED',
  },
  {
    key: 'motivator',
    name: 'Motivator Agent',
    emoji: '🔥',
    role: 'Progress tracking, goal milestones, and daily encouragement messages.',
    color: '#7C3AED',
    bg: '#F5F3FF',
  },
  {
    key: 'analyst',
    name: 'Analyst Agent',
    emoji: '📊',
    role: 'Mood trends, performance patterns, and data-driven insights.',
    color: '#0F766E',
    bg: '#F0FDFA',
  },
];

const sampleFlow = [
  { step: 1, actor: '🧠 Orchestrator', action: 'Receives user message and classifies intent', },
  { step: 2, actor: '🔀 Router', action: 'Selects 1–3 most relevant specialist agents', },
  { step: 3, actor: '⚡ Specialists', action: 'Run in parallel, each generating a domain-specific response', },
  { step: 4, actor: '🔗 Synthesizer', action: 'Merges specialist replies into one cohesive answer', },
  { step: 5, actor: '✅ Output', action: 'Delivers response + action card (quiz, event, insight) to student', },
];

export default function HivePage() {
  return (
    <div className="max-w-4xl mx-auto py-12 space-y-16">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-[#E4E4E7] pb-10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Network className="w-6 h-6 text-[#D97757]" strokeWidth={1.5} />
          <span className="text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]">Multi-Agent Architecture</span>
        </div>
        <h1 className="text-4xl font-serif text-[#27272A] mb-4">Hive of Minds</h1>
        <p className="text-[#71717A] text-lg max-w-2xl leading-relaxed">
          Every message you send is intelligently routed to a committee of specialist AI agents. They work in parallel and their insights are synthesized into one coherent, context-aware response.
        </p>
        <Link
          href="/companion"
          className="inline-flex items-center gap-2 mt-6 bg-[#27272A] text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-[#3F3F46] transition-colors"
        >
          Talk to the Hive <ArrowRight className="w-4 h-4" />
        </Link>
      </motion.div>

      {/* Agent Cards */}
      <section>
        <h2 className="text-xl font-serif text-[#27272A] mb-8">The Committee</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AGENTS.map((agent, i) => (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white border border-[#E4E4E7] rounded-2xl p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: agent.bg }}
                >
                  {agent.emoji}
                </span>
                <div>
                  <h3 className="font-serif font-semibold text-[#27272A] text-base leading-tight">{agent.name}</h3>
                  {agent.key === 'router' && (
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#D97757]">Orchestrator</span>
                  )}
                </div>
              </div>
              <p className="text-sm text-[#71717A] leading-relaxed">{agent.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Orchestration Flow */}
      <section>
        <h2 className="text-xl font-serif text-[#27272A] mb-8">How It Works</h2>
        <div className="space-y-0">
          {sampleFlow.map((step, i) => (
            <div key={i} className="flex gap-6 relative">
              {/* Vertical line */}
              {i < sampleFlow.length - 1 && (
                <div className="absolute left-[19px] top-10 bottom-0 w-px bg-[#E4E4E7]" />
              )}
              <div className="w-10 h-10 rounded-full bg-[#F4F4F5] border border-[#E4E4E7] flex items-center justify-center text-sm font-mono text-[#71717A] shrink-0 z-10">
                {step.step}
              </div>
              <div className="pb-8">
                <p className="font-medium text-[#27272A] text-sm">{step.actor}</p>
                <p className="text-[#71717A] text-sm mt-0.5">{step.action}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Context Engine section */}
      <section className="border-t border-[#E4E4E7] pt-12">
        <h2 className="text-xl font-serif text-[#27272A] mb-4">Context Engine</h2>
        <p className="text-[#71717A] text-sm mb-6 leading-relaxed max-w-2xl">
          Every agent call is automatically enriched with the student's live context, ensuring responses are deeply personalized rather than generic.
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Exam Target', value: 'JEE Advanced 2027' },
            { label: 'Mood (Last 7d)', value: 'Moderate stress' },
            { label: 'Uploaded Docs', value: '2 materials' },
            { label: 'Upcoming Events', value: '2 sessions' },
          ].map((item) => (
            <div key={item.label} className="bg-white border border-[#E4E4E7] rounded-xl p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">{item.label}</p>
              <p className="text-sm font-medium text-[#27272A]">{item.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
