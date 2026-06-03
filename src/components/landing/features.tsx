"use client";

import { motion } from "framer-motion";
import {
  Brain,
  FolderKanban,
  BookOpen,
  ShoppingBag,
  Rocket,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Brain,
    title: "AI Team Matching",
    description:
      "Our AI analyzes skills, interests, and experience to match you with the perfect teammates for any project.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: FolderKanban,
    title: "Project Workspace",
    description:
      "Complete collaboration tools — group chat, file sharing, task tracking, and video calls in one place.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: BookOpen,
    title: "Knowledge Hub",
    description:
      "Upload and access notes, previous papers, and study materials organized by university and subject.",
    gradient: "from-emerald-500 to-green-600",
  },
  {
    icon: Users,
    title: "Study Groups",
    description:
      "Join subject-based study groups, participate in discussions, and learn together with peers worldwide.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: ShoppingBag,
    title: "Student Marketplace",
    description:
      "Buy and sell textbooks, gadgets, notes, and digital services within a trusted student community.",
    gradient: "from-pink-500 to-rose-500",
  },
  // Hidden - code preserved
  // {
  //   icon: Rocket,
  //   title: "Startup Hub",
  //   description:
  //     "Pitch business ideas, find co-founders, validate concepts, and build startups from scratch.",
  //   gradient: "from-indigo-500 to-violet-600",
  // },
];

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export function Features() {
  return (
    <section id="features" className="py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="font-heading text-3xl md:text-4xl font-bold tracking-tight">
            Everything You Need to{" "}
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Succeed Together
            </span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            One platform that bridges learning, collaboration, and real-world
            experience for students everywhere.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-100px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
        >
          {features.map((feature) => (
            <motion.div key={feature.title} variants={item}>
              <Card className="group relative overflow-hidden border bg-card hover:shadow-xl transition-all duration-300 h-full">
                <CardContent className="p-6">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} text-white mb-4`}
                  >
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="font-heading text-xl font-semibold mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
