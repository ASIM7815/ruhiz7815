"use client";

import { motion } from "framer-motion";
import { UserPlus, Search, Users } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: UserPlus,
    title: "Create Your Profile",
    description:
      "Sign up with your college email, add your skills and interests, and choose to be a Leader or Member.",
  },
  {
    number: "02",
    icon: Search,
    title: "Find or Create Projects",
    description:
      "Browse project ideas posted by leaders or create your own. Our AI recommends the best matches for you.",
  },
  {
    number: "03",
    icon: Users,
    title: "Collaborate & Grow",
    description:
      "Join teams, build together in the workspace, share knowledge, and earn reputation as you contribute.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 md:py-28 bg-muted/30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Get Started in{" "}
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Three Simple Steps
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From signing up to shipping your first project, we make
            collaboration effortless.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 relative">
          {/* Connector line */}
          <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-primary/40 via-purple-400/40 to-primary/40" />

          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="relative text-center"
            >
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold font-heading mb-6 relative z-10">
                {step.number}
              </div>
              <h3 className="font-heading text-xl font-semibold mb-3">
                {step.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
