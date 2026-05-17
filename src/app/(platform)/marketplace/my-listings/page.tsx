"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  Plus,
  Loader2,
  Package,
  CheckCircle2,
  X,
  Edit,
  Eye,
  EyeOff,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatRelativeTime } from "@/lib/format";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string | null;
  imageUrl: string | null;
  sold: boolean;
  status: string;
  createdAt: string;
}

const categoryColors: Record<string, string> = {
  BOOK: "bg-blue-500/10 text-blue-600 border-blue-200",
  GADGET: "bg-purple-500/10 text-purple-600 border-purple-200",
  SERVICE: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function MyListingsPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadListings() {
      try {
        const res = await fetch("/api/marketplace?seller=me");
        if (res.ok) {
          const data = await res.json();
          setListings(data.listings || []);
        } else {
          toast.error("Failed to load your listings");
        }
      } catch (error) {
        console.error("Load listings error:", error);
        toast.error("Failed to load your listings");
      } finally {
        setLoading(false);
      }
    }
    loadListings();
  }, []);

  async function handleMarkSold(id: string) {
    try {
      const res = await fetch(`/api/marketplace/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sold: true }),
      });
      if (res.ok) {
        toast.success("Marked as sold!");
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, sold: true } : l))
        );
      } else {
        toast.error("Failed to update listing");
      }
    } catch (error) {
      console.error("Mark sold error:", error);
      toast.error("Failed to update listing");
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "HIDDEN" : "ACTIVE";
    try {
      const res = await fetch(`/api/marketplace/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(
          newStatus === "HIDDEN" ? "Listing hidden" : "Listing activated"
        );
        setListings((prev) =>
          prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l))
        );
      } else {
        toast.error("Failed to update listing");
      }
    } catch (error) {
      console.error("Toggle status error:", error);
      toast.error("Failed to update listing");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const res = await fetch(`/api/marketplace/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Listing deleted");
        setListings((prev) => prev.filter((l) => l.id !== id));
      } else {
        toast.error("Failed to delete listing");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete listing");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            My Listings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your marketplace listings
          </p>
        </div>
        <Link href="/marketplace/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Listing
          </Button>
        </Link>
      </div>

      {listings.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">
              You haven't created any listings yet
            </p>
            <Link href="/marketplace/create">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Listing
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card
              key={listing.id}
              className="hover:border-primary/30 transition-all"
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Image */}
                  <div className="h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-muted">
                    {listing.imageUrl ? (
                      <Image
                        src={listing.imageUrl}
                        alt=""
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-8 w-8 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link href={`/marketplace/${listing.id}`}>
                        <h3 className="font-medium text-sm truncate hover:text-primary transition-colors">
                          {listing.title}
                        </h3>
                      </Link>
                      {listing.sold && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">
                          Sold
                        </Badge>
                      )}
                      {listing.status === "HIDDEN" && (
                        <Badge variant="secondary" className="text-xs">
                          Hidden
                        </Badge>
                      )}
                      {listing.status === "UNDER_REVIEW" && (
                        <Badge variant="outline" className="text-xs">
                          Under Review
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-sm font-bold text-primary">
                        ₹{listing.price}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          categoryColors[listing.category] || ""
                        }`}
                      >
                        {listing.category}
                      </Badge>
                      {listing.condition && (
                        <Badge variant="secondary" className="text-xs">
                          {listing.condition}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(listing.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/marketplace/${listing.id}`}>
                      <Button
                        size="sm"
                        variant="ghost"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                    {!listing.sold && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            handleToggleStatus(listing.id, listing.status)
                          }
                          title={
                            listing.status === "ACTIVE" ? "Hide" : "Activate"
                          }
                        >
                          {listing.status === "ACTIVE" ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleMarkSold(listing.id)}
                          title="Mark as sold"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(listing.id)}
                      title="Delete"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
