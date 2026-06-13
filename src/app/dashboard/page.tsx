"use client";



const activeStrategies = [
  "Take a 15-min walk after every 2 hours of study",
  "Practice 4-7-8 breathing before bed",
  "Don't check mock test scores after 9 PM"
];

const commonTriggers = [
  { name: "Mock Test Scores", count: 12 },
  { name: "Peer Comparison", count: 8 },
  { name: "Sleep Deprivation", count: 5 }
];

export default function DashboardPage() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="mb-12 border-b border-[#E4E4E7] pb-8">
        <h1 className="text-3xl font-serif text-[#27272A] mb-2">Dashboard</h1>
        <p className="text-[#71717A] text-sm">Tracking your journey through high-stakes prep.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Avg Mood (7 Days)</h3>
          <p className="text-4xl font-serif text-[#27272A]">6.5</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Stress Level</h3>
          <p className="text-4xl font-serif text-[#D97757]">Moderate</p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A1A1AA] mb-1">Exam Target</h3>
          <p className="text-4xl font-serif text-[#27272A]">JEE Adv 2027</p>
        </div>
      </div>

      <div className="space-y-12">
        <section>
          <h2 className="text-xl font-serif text-[#27272A] mb-6">Active Coping Strategies</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activeStrategies.map((strategy, i) => (
              <div key={i} className="flex gap-3 text-sm text-[#3F3F46] items-start p-4 bg-white border border-[#E4E4E7] rounded-xl">
                <div className="w-1.5 h-1.5 rounded-full bg-[#D97757] mt-1.5 shrink-0" />
                {strategy}
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-xl font-serif text-[#27272A] mb-6">Detected Triggers</h2>
          <div className="space-y-4 max-w-lg">
            {commonTriggers.map((trigger, i) => (
              <div key={i} className="flex justify-between items-center text-sm border-b border-[#E4E4E7] pb-3">
                <span className="text-[#3F3F46]">{trigger.name}</span>
                <span className="text-[#A1A1AA]">{trigger.count} logs</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
