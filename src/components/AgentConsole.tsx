'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AgentLog, AgentName } from '@/types';
import { Terminal, Shield, Activity, DollarSign, Clock, CheckCircle, BrainCircuit } from 'lucide-react';

interface AgentConsoleProps {
  logs: AgentLog[];
  onComplete: () => void;
}

const AGENT_META: Record<AgentName, { name: string; color: string; icon: any }> = {
  health: { name: '🩺 Health Analyzer', color: 'text-rose-400 border-rose-500/30 bg-rose-500/5', icon: Shield },
  recipe: { name: '🍳 Recipe Planner', color: 'text-emerald-400 border-emerald-500/30 bg-emerald-500/5', icon: BrainCircuit },
  budget: { name: '💳 Budget Analyst', color: 'text-amber-400 border-amber-500/30 bg-amber-500/5', icon: DollarSign },
  coordinator: { name: '⏱️ Cooking Coordinator', color: 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5', icon: Clock }
};

export default function AgentConsole({ logs, onComplete }: AgentConsoleProps) {
  const [visibleLogs, setVisibleLogs] = useState<AgentLog[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logs.length === 0) return;

    if (currentStep < logs.length) {
      // Simulate typical network and cognitive reasoning latency per agent step
      const timeout = setTimeout(() => {
        setVisibleLogs(prev => [...prev, logs[currentStep]]);
        setCurrentStep(prev => prev + 1);
      }, currentStep === 0 ? 500 : 1500); // slightly faster first line

      return () => clearTimeout(timeout);
    } else {
      // Finished all logs
      const timeout = setTimeout(() => {
        onComplete();
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [currentStep, logs, onComplete]);

  // Scroll to bottom of terminal when logs print
  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLogs]);

  // Get currently active agent
  const activeAgent = currentStep < logs.length ? logs[currentStep].agent : null;

  return (
    <div className="w-full max-w-2xl mx-auto p-1 animate-fade-in">
      <div className="backdrop-blur-md bg-zinc-950/80 border border-emerald-500/30 rounded-2xl overflow-hidden shadow-2xl shadow-emerald-950/50">
        
        {/* Terminal Header */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono text-xs text-zinc-300 font-bold tracking-wider uppercase">
              Agent Collaboration Console
            </span>
          </div>
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"></span>
          </div>
        </div>

        {/* Live Active Agents Header Indicator */}
        <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex flex-wrap gap-2 justify-center items-center">
          {(Object.keys(AGENT_META) as AgentName[]).map(agentKey => {
            const meta = AGENT_META[agentKey];
            const isActive = activeAgent === agentKey;
            const isCompleted = visibleLogs.some(l => l.agent === agentKey && l.status === 'completed');
            
            return (
              <div
                key={agentKey}
                className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${
                  isActive
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300 scale-105 shadow-md shadow-emerald-500/10'
                    : isCompleted
                    ? 'border-zinc-800 bg-zinc-900/20 text-zinc-500'
                    : 'border-zinc-900 bg-zinc-900/10 text-zinc-700'
                }`}
              >
                <meta.icon className={`w-3 h-3 ${isActive ? 'animate-bounce' : ''}`} />
                <span>{meta.name.split(' ')[1]}</span>
              </div>
            );
          })}
        </div>

        {/* Terminal Body */}
        <div className="p-4 md:p-6 font-mono text-[11px] md:text-xs text-zinc-400 space-y-4 max-h-[350px] min-h-[250px] overflow-y-auto scrollbar-thin scrollbar-track-zinc-950 scrollbar-thumb-zinc-800">
          
          {/* Default Start */}
          <div className="flex gap-2 text-zinc-500">
            <span className="text-emerald-500">&gt;</span>
            <span>Initializing Gemini multi-agent loop...</span>
          </div>

          {visibleLogs.map((log, index) => {
            const meta = AGENT_META[log.agent];
            const Icon = meta.icon;
            
            let statusStyle = 'text-zinc-400';
            if (log.status === 'completed') statusStyle = 'text-emerald-400 font-bold';
            if (log.status === 'warning') statusStyle = 'text-amber-400';
            if (log.status === 'running') statusStyle = 'text-cyan-400 animate-pulse';

            return (
              <div key={index} className="space-y-1 animate-fade-in border-l-2 border-zinc-800 pl-3 ml-1">
                <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                  <span>[{log.timestamp}]</span>
                  <span className={`font-semibold ${meta.color.split(' ')[0]}`}>{meta.name}</span>
                </div>
                <div className="flex gap-2 items-start pl-2">
                  <span className="text-emerald-500/60 mt-0.5">&gt;</span>
                  <span className={`flex-1 ${statusStyle}`}>{log.message}</span>
                </div>
              </div>
            );
          })}

          {/* Typing Indicator */}
          {currentStep < logs.length && (
            <div className="flex items-center gap-2 text-zinc-600 animate-pulse pl-1.5">
              <span className="w-1.5 h-3 bg-emerald-500 animate-pulse"></span>
              <span className="italic">
                {AGENT_META[logs[currentStep].agent].name} is calculating...
              </span>
            </div>
          )}

          {/* Complete Success Alert */}
          {currentStep === logs.length && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3 animate-fade-in text-emerald-300">
              <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <div>
                <p className="font-bold text-xs">Analysis Complete</p>
                <p className="text-[10px] text-emerald-400/80 mt-0.5">
                  Meal plan, checklists, and budget options compiled. Loading dashboard...
                </p>
              </div>
            </div>
          )}

          <div ref={terminalEndRef} />
        </div>
      </div>
    </div>
  );
}
