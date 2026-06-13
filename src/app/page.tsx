"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center max-w-2xl mx-auto py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#A1A1AA]"
      >
        AI-Powered Student Well-being
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.05 }}
        className="text-5xl md:text-6xl font-serif text-[#27272A] mb-5"
      >
        MindSpace
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="text-[#71717A] text-lg mb-10 leading-relaxed max-w-lg"
      >
        A committee of AI agents tracks your mood, manages your calendar, quizzes you, and supports your mental well-being — all in one place.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Link
          href="/companion"
          className="flex items-center justify-center gap-2 bg-[#27272A] hover:bg-[#3F3F46] text-white text-[15px] py-3 px-7 rounded-xl transition-colors"
        >
          Talk to the Hive <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/hive"
          className="flex items-center justify-center bg-white hover:bg-[#F4F4F5] text-[#27272A] text-[15px] py-3 px-7 rounded-xl border border-[#E4E4E7] transition-colors"
        >
          See Architecture
        </Link>
      </motion.div>
    </div>
  );
}

