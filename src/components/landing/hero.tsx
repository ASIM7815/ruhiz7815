"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";

const vibes = [
  "build projects together 🔨",
  "find your co-founder 🤝",
  "share knowledge freely 📚",
  "launch startups early 🚀",
  "grow your network 🌐",
  "learn by doing 💡",
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-24 pb-16 md:pt-32 md:pb-24">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute top-20 right-1/4 w-80 h-80 bg-purple-400/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/80 backdrop-blur-sm px-4 py-1.5 text-sm text-muted-foreground mb-8">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-Powered Student Collaboration</span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
          >
            Where Students{" "}
            <span className="bg-gradient-to-r from-primary via-purple-500 to-blue-500 bg-clip-text text-transparent">
              Build Together
            </span>
          </motion.h1>

          {/* Subtext */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
          >
            Find teammates with AI matching, build real-world projects, share
            knowledge, and launch startups — all in one platform.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Button size="lg" className="h-12 px-8 text-base" render={<Link href="/register" />}>
                Start Collaborating
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 px-8 text-base"
              render={<Link href="/#features" />}
            >
              See How It Works
            </Button>
          </motion.div>

          {/* Animated vibe text */}
          <VibeText />
        </div>
      </div>
    </section>
  );
}

function VibeText() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % vibes.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="mt-10 sm:mt-14 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-base sm:text-lg text-muted-foreground"
    >
      <span>Made for students who</span>
      <span className="relative h-7 sm:h-8 overflow-hidden w-48 sm:w-56 text-center sm:text-left">
        {vibes.map((vibe, i) => (
          <motion.span
            key={vibe}
            className="absolute inset-0 font-semibold bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent"
            initial={{ y: 30, opacity: 0 }}
            animate={{
              y: i === index ? 0 : i === (index - 1 + vibes.length) % vibes.length ? -30 : 30,
              opacity: i === index ? 1 : 0,
            }}
            transition={{ duration: 0.4 }}
          >
            {vibe}
          </motion.span>
        ))}
      </span>
    </motion.div>
  );
}
