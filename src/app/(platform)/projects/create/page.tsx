"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useState } from "react";
import { X } from "lucide-react";

const skillSuggestions = [
  "JavaScript", "TypeScript", "Python", "React", "Node.js", "Next.js",
  "Java", "C++", "Go", "Rust", "Flutter", "Swift", "Kotlin",
  "Machine Learning", "Data Science", "DevOps", "Docker", "AWS",
  "PostgreSQL", "MongoDB", "GraphQL", "UI/UX Design", "Figma",
  "Blockchain", "Solidity", "Firebase", "Redis", "Kubernetes",
];

export default function CreateProjectPage() {
  const router = useRouter();
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [description, setDescription] = useState("");
  const [timeline, setTimeline] = useState("");
  const [teamSize, setTeamSize] = useState("4");

  const toggleSkill = (skill: string) => {
    setSkills((prev) =>
      prev.includes(skill)
        ? prev.filter((s) => s !== skill)
        : prev.length < 10
        ? [...prev, skill]
        : prev
    );
  };

  async function handleSubmit() {
    if (!title || !problem || !description) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          problem,
          description,
          timeline: timeline || null,
          maxMembers: parseInt(teamSize) || 4,
          skills,
        }),
      });
      if (!res.ok) throw new Error("Failed to create project");
      const { id } = await res.json();
      router.push(`/projects/${id}`);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" render={<Link href="/projects" />}>
            <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-bold">
            Post a Project Idea
          </h1>
          <p className="text-muted-foreground">
            Describe your project and find the right team
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Provide clear details to attract the best teammates
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Project Title</Label>
            <Input id="title" placeholder="e.g. AI-Powered Study Planner" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="problem">Problem Statement</Label>
            <textarea
              id="problem"
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="What problem does your project solve?"
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Detailed Description</Label>
            <textarea
              id="description"
              className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Describe the project goals, features, and expected deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="timeline">Timeline</Label>
              <Input id="timeline" placeholder="e.g. 8 weeks" value={timeline} onChange={(e) => setTimeline(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team-size">Team Size</Label>
              <Input
                id="team-size"
                type="number"
                placeholder="e.g. 4"
                min="2"
                max="10"
                value={teamSize}
                onChange={(e) => setTeamSize(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>
              Required Skills{" "}
              <span className="text-muted-foreground font-normal">
                (select up to 10)
              </span>
            </Label>
            <div className="flex flex-wrap gap-2">
              {skillSuggestions.map((skill) => (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-all border ${
                    skills.includes(skill)
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:border-primary/50 text-muted-foreground"
                  }`}
                >
                  {skill}
                  {skills.includes(skill) && <X className="h-3 w-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" render={<Link href="/projects" />}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || !title || !problem || !description}>
              {submitting ? "Publishing..." : "Publish Project"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
