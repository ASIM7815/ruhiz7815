"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  GraduationCap,
  Calendar,
  Star,
  FolderKanban,
  BookOpen,
  Users,
  Edit,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface UserProfile {
  id: string;
  uid: string | null;
  name: string;
  email: string;
  image: string | null;
  bio: string | null;
  university: string | null;
  role: string;
  reputation: number;
  createdAt: string;
  skills: string[];
  interests: string[];
  stats: {
    projects: number;
    resources: number;
    studyGroups: number;
  };
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/user/me")
      .then((r) => r.json())
      .then(setUser);
  }, []);

  function copyUid() {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="h-48 bg-muted animate-pulse rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  const joinedDate = new Date(user.createdAt).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-6">
            <Avatar className="h-24 w-24 border-4 border-primary/20">
              <AvatarImage src={user.image || undefined} />
              <AvatarFallback className="text-2xl font-heading">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h1 className="font-heading text-2xl font-bold">
                      {user.name}
                    </h1>
                    {user.uid && (
                      <Badge
                        variant="secondary"
                        className="cursor-pointer gap-1"
                        onClick={copyUid}
                      >
                        #{user.uid}
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 text-sm text-muted-foreground">
                    {user.university && (
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {user.university}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      Joined {joinedDate}
                    </span>
                  </div>
                </div>
                <Link href="/settings">
                  <Button variant="outline" size="sm" className="w-full sm:w-auto shrink-0">
                    <Edit className="mr-2 h-3 w-3" />
                    Edit Profile
                  </Button>
                </Link>
              </div>
              {user.bio && (
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {user.bio}
                </p>
              )}
              <div className="flex items-center gap-4 mt-4">
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3" />
                  {user.reputation} Reputation
                </Badge>
                <Badge variant="secondary">{user.role}</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: "Projects", value: user.stats?.projects || 0, icon: FolderKanban },
          { label: "Resources", value: user.stats?.resources || 0, icon: BookOpen },
          { label: "Study Groups", value: user.stats?.studyGroups || 0, icon: Users },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <stat.icon className="h-5 w-5 mx-auto text-primary mb-2" />
              <p className="text-2xl font-bold font-heading">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Skills */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.skills && user.skills.length > 0 ? (
                user.skills.map((skill) => (
                  <Badge key={skill} variant="secondary">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills added yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Interests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Interests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {user.interests && user.interests.length > 0 ? (
                user.interests.map((interest) => (
                  <Badge key={interest} variant="outline">
                    {interest}
                  </Badge>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No interests added yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
