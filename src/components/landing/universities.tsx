"use client";

import { motion } from "framer-motion";

const memories = [
  { text: "3am debugging sessions", emoji: "🐛", gradient: "from-violet-500/20 to-purple-500/20", border: "border-violet-500/30", glow: "shadow-violet-500/10" },
  { text: "submitting 1 min before deadline", emoji: "⏰", gradient: "from-red-500/20 to-orange-500/20", border: "border-red-500/30", glow: "shadow-red-500/10" },
  { text: "\"it works on my machine\"", emoji: "💻", gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", glow: "shadow-blue-500/10" },
  { text: "free pizza at tech talks", emoji: "🍕", gradient: "from-amber-500/20 to-yellow-500/20", border: "border-amber-500/30", glow: "shadow-amber-500/10" },
  { text: "imposter syndrome → shipped it", emoji: "🚀", gradient: "from-emerald-500/20 to-green-500/20", border: "border-emerald-500/30", glow: "shadow-emerald-500/10" },
  { text: "first PR merged", emoji: "🎉", gradient: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", glow: "shadow-pink-500/10" },
  { text: "caffeine-powered all-nighters", emoji: "☕", gradient: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/30", glow: "shadow-orange-500/10" },
  { text: "\"just one more feature\" at 4am", emoji: "🌙", gradient: "from-indigo-500/20 to-blue-500/20", border: "border-indigo-500/30", glow: "shadow-indigo-500/10" },
  { text: "group project carry", emoji: "💪", gradient: "from-fuchsia-500/20 to-pink-500/20", border: "border-fuchsia-500/30", glow: "shadow-fuchsia-500/10" },
  { text: "stackoverflow era", emoji: "📋", gradient: "from-teal-500/20 to-cyan-500/20", border: "border-teal-500/30", glow: "shadow-teal-500/10" },
  { text: "demo day butterflies", emoji: "🦋", gradient: "from-sky-500/20 to-blue-500/20", border: "border-sky-500/30", glow: "shadow-sky-500/10" },
  { text: "finding your co-founder", emoji: "🤝", gradient: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", glow: "shadow-purple-500/10" },
];

export function Universities() {
  return (
    <section className="py-14 border-y border-primary/5 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-32 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 right-1/4 -translate-y-1/2 w-64 h-32 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase mb-10">
          <span className="bg-gradient-to-r from-primary via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Built for students who get it
          </span>
        </p>

        {/* Row 1 - scrolls left */}
        <div className="relative overflow-hidden mb-4">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <motion.div
            className="flex gap-4 items-center"
            animate={{ x: ["0%", "-50%"] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear",
              },
            }}
          >
            {[...memories.slice(0, 6), ...memories.slice(0, 6)].map((m, i) => (
              <div
                key={`r1-${i}`}
                className={`flex-shrink-0 flex items-center gap-3 h-14 px-6 rounded-2xl bg-gradient-to-r ${m.gradient} backdrop-blur-md border ${m.border} shadow-lg ${m.glow} hover:scale-105 transition-transform duration-300 cursor-default`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-sm font-medium text-foreground/90 whitespace-nowrap">
                  {m.text}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Row 2 - scrolls right */}
        <div className="relative overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-background to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-background to-transparent z-10 pointer-events-none" />
          <motion.div
            className="flex gap-4 items-center"
            animate={{ x: ["-50%", "0%"] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 35,
                ease: "linear",
              },
            }}
          >
            {[...memories.slice(6), ...memories.slice(6)].map((m, i) => (
              <div
                key={`r2-${i}`}
                className={`flex-shrink-0 flex items-center gap-3 h-14 px-6 rounded-2xl bg-gradient-to-r ${m.gradient} backdrop-blur-md border ${m.border} shadow-lg ${m.glow} hover:scale-105 transition-transform duration-300 cursor-default`}
              >
                <span className="text-xl">{m.emoji}</span>
                <span className="text-sm font-medium text-foreground/90 whitespace-nowrap">
                  {m.text}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
