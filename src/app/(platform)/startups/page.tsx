import Link from "next/link";
import {
  Search,
  Plus,
  Rocket,
  Users,
  Target,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const startups: {
  id: string;
  title: string;
  problem: string;
  solution: string;
  stage: string;
  founders: { name: string; avatar: string }[];
  lookingFor: string[];
}[] = [];

const stageColors: Record<string, string> = {
  IDEA: "bg-yellow-500/10 text-yellow-700 border-yellow-200",
  VALIDATION: "bg-blue-500/10 text-blue-600 border-blue-200",
  BUILDING: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

const stageIcons: Record<string, typeof Lightbulb> = {
  IDEA: Lightbulb,
  VALIDATION: Target,
  BUILDING: Rocket,
};

export default function StartupsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Startup Hub
          </h1>
          <p className="text-muted-foreground mt-1">
            Pitch ideas, find co-founders, and build startups from scratch
          </p>
        </div>
        <Button render={<Link href="/startups/create" />}>
            <Rocket className="mr-2 h-4 w-4" />
            Pitch an Idea
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search startup pitches..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {["All", "Idea", "Validation", "Building"].map((stage) => (
            <Badge
              key={stage}
              variant={stage === "All" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
            >
              {stage}
            </Badge>
          ))}
        </div>
      </div>

      {/* Startup Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        {startups.map((startup) => {
          const StageIcon = stageIcons[startup.stage];
          return (
            <Card
              key={startup.id}
              className="group hover:shadow-lg hover:border-primary/30 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge
                    variant="outline"
                    className={stageColors[startup.stage]}
                  >
                    <StageIcon className="h-3 w-3 mr-1" />
                    {startup.stage.charAt(0) +
                      startup.stage.slice(1).toLowerCase()}
                  </Badge>
                </div>
                <h3 className="font-heading text-lg font-semibold mt-2 group-hover:text-primary transition-colors">
                  {startup.title}
                </h3>
              </CardHeader>
              <CardContent className="pb-3 space-y-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Problem
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {startup.problem}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Solution
                  </p>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {startup.solution}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                    Looking For
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {startup.lookingFor.map((role) => (
                      <Badge key={role} variant="secondary" className="text-xs">
                        {role}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="pt-3 border-t">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {startup.founders.map((founder, i) => (
                        <Avatar
                          key={i}
                          className="h-7 w-7 border-2 border-background"
                        >
                          <AvatarImage src={founder.avatar} />
                          <AvatarFallback>
                            {founder.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {startup.founders.length} founder
                      {startup.founders.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  <Button variant="default" size="sm">
                    Join as Co-founder
                  </Button>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
