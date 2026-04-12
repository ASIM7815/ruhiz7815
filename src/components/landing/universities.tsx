"use client";

import { motion } from "framer-motion";

const universities = [
  "MIT",
  "Stanford",
  "Oxford",
  "IIT Delhi",
  "Harvard",
  "Cambridge",
  "NUS",
  "ETH Zurich",
  "IIT Bombay",
  "Caltech",
  "Tokyo U",
  "TU Munich",
];

export function Universities() {
  return (
    <section className="py-12 border-y bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-center text-sm font-medium text-muted-foreground mb-8">
          TRUSTED BY STUDENTS FROM TOP UNIVERSITIES WORLDWIDE
        </p>
        <div className="relative overflow-hidden">
          <motion.div
            className="flex gap-12 items-center"
            animate={{ x: [0, -1200] }}
            transition={{
              x: {
                repeat: Infinity,
                repeatType: "loop",
                duration: 30,
                ease: "linear",
              },
            }}
          >
            {[...universities, ...universities].map((uni, i) => (
              <div
                key={`${uni}-${i}`}
                className="flex-shrink-0 flex items-center justify-center h-12 px-6 rounded-lg bg-background border"
              >
                <span className="font-semibold text-sm text-muted-foreground whitespace-nowrap">
                  {uni}
                </span>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
