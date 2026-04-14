"use client";

import { motion } from "framer-motion";

const memories = [
  "3am debugging sessions 🐛",
  "submitting 1 min before deadline ⏰",
  "\"it works on my machine\" 💻",
  "free pizza at tech talks 🍕",
  "imposter syndrome → shipped it anyway 🚀",
  "first pull request merged 🎉",
  "caffeine-powered all-nighters ☕",
  "\"just one more feature\" at 4am 🌙",
  "group project carry 💪",
  "stackoverflow copy-paste era 📋",
  "demo day butterflies 🦋",
  "finding your co-founder in class 🤝",
];

export function Universities() {
  return (
    <section className="py-12 border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          BUILT FOR STUDENTS WHO GET IT 💯
        </p>
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-8 items-center"
            animate={{ x: [0, -1200] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 35,
                ease: "linear",
              },
            }}
          >
            {[...memories, ...memories].map((memory, i) => (
              <div
                key={`${memory}-${i}`}
                className="flex-shrink-0 flex items-center justify-center h-12 px-5 rounded-full bg-background/80 backdrop-blur-sm border border-primary/10 hover:border-primary/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {memory}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
