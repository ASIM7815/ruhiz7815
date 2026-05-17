"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Eye,
  Star,
  FileText,
  BookOpen,
  GraduationCap,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useSupabaseUser } from "@/hooks/use-supabase-user";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  fileUrl: string | null;
  university: string | null;
  rating: number;
  downloads: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    image: string | null;
    uid: string | null;
  };
};

type Review = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

const typeIcons: Record<string, typeof FileText> = {
  NOTES: BookOpen,
  PAPER: FileText,
  MATERIAL: GraduationCap,
};

const typeColors: Record<string, string> = {
  NOTES: "bg-blue-500/10 text-blue-600 border-blue-200",
  PAPER: "bg-amber-500/10 text-amber-600 border-amber-200",
  MATERIAL: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [resource, setResource] = useState<Resource | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadResource();
    loadReviews();
  }, [id]);

  async function loadResource() {
    try {
      const res = await fetch(`/api/resources/${id}`);
      if (res.ok) {
        const data = await res.json();
        setResource(data);
      } else {
        toast.error("Resource not found");
        router.push("/knowledge");
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadReviews() {
    try {
      const res = await fetch(`/api/resources/${id}/reviews`);
      if (res.ok) {
        const data = await res.json();
        setReviews(data.reviews || []);
      }
    } catch (err) {
      console.error("Failed to load reviews:", err);
    }
  }

  async function handleDownload() {
    if (!resource?.fileUrl) {
      toast.error("No file attached to this resource.");
      return;
    }

    // Increment download count
    fetch(`/api/resources/${id}/download`).catch(() => {});

    try {
      const res = await fetch(resource.fileUrl);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = resource.title;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
      toast.success("Download started");
    } catch {
      window.open(resource.fileUrl, "_blank", "noopener,noreferrer");
    }
  }

  async function handleSubmitReview() {
    if (!rating) {
      toast.error("Please select a rating");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/resources/${id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment: comment.trim() || null }),
      });

      if (res.ok) {
        toast.success("Review submitted!");
        setRating(0);
        setComment("");
        loadReviews();
        loadResource(); // Refresh to get updated average rating
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit review");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return null;
  }

  const TypeIcon = typeIcons[resource.type] || FileText;
  const userHasReviewed = reviews.some((r) => r.user.id === user?.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" render={<Link href="/knowledge" />}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold">{resource.title}</h1>
          <p className="text-sm text-muted-foreground">
            Uploaded by {resource.author.name}
          </p>
        </div>
      </div>

      {/* Resource Info */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={typeColors[resource.type]}>
                  <TypeIcon className="h-3 w-3 mr-1" />
                  {resource.type.charAt(0) + resource.type.slice(1).toLowerCase()}
                </Badge>
                {resource.university && (
                  <Badge variant="secondary">{resource.university}</Badge>
                )}
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{resource.rating.toFixed(1)}</span>
                  <span>({reviews.length} reviews)</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Download className="h-4 w-4" />
                  {resource.downloads.toLocaleString()} downloads
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              {resource.fileUrl && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => window.open(resource.fileUrl!, "_blank")}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </Button>
                  <Button onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {resource.description && (
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Description</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {resource.description}
              </p>
            </div>
          )}
          <div className="mt-4 flex items-center gap-3 pt-4 border-t">
            <Avatar className="h-10 w-10">
              <AvatarImage src={resource.author.image || undefined} />
              <AvatarFallback>
                {resource.author.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-sm">{resource.author.name}</p>
              {resource.author.uid && (
                <p className="text-xs text-muted-foreground">#{resource.author.uid}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Reviews Section */}
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Review Form */}
          {user && !userHasReviewed && user.id !== resource.author.id && (
            <div className="space-y-4 pb-6 border-b">
              <div>
                <p className="text-sm font-medium mb-2">Your Rating</p>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          star <= (hoverRating || rating)
                            ? "fill-yellow-400 text-yellow-400"
                            : "text-gray-300"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Comment (optional)</p>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your thoughts about this resource..."
                  rows={3}
                />
              </div>
              <Button
                onClick={handleSubmitReview}
                disabled={!rating || submitting}
                className="w-full sm:w-auto"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Review
              </Button>
            </div>
          )}

          {/* Reviews List */}
          {reviews.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              No reviews yet. Be the first to review!
            </p>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="space-y-2">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={review.user.image || undefined} />
                      <AvatarFallback>
                        {review.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{review.user.name}</p>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <Star
                              key={star}
                              className={`h-3 w-3 ${
                                star <= review.rating
                                  ? "fill-yellow-400 text-yellow-400"
                                  : "text-gray-300"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {review.comment}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
