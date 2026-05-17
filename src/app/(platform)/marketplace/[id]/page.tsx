"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  ArrowLeft,
  MessageCircle,
  Loader2,
  Package,
  Tag,
  Calendar,
  User,
  MapPin,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
  seller: {
    id: string;
    name: string;
    image: string | null;
    university: string | null;
    uid: string | null;
  };
}

const categoryColors: Record<string, string> = {
  BOOK: "bg-blue-500/10 text-blue-600 border-blue-200",
  GADGET: "bg-purple-500/10 text-purple-600 border-purple-200",
  SERVICE: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function ListingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [contacting, setContacting] = useState(false);

  useEffect(() => {
    async function loadListing() {
      try {
        const res = await fetch(`/api/marketplace/${id}`);
        if (res.ok) {
          const data = await res.json();
          setListing(data);
        } else if (res.status === 404) {
          toast.error("Listing not found");
          router.push("/marketplace");
        } else {
          toast.error("Failed to load listing");
        }
      } catch (error) {
        console.error("Load listing error:", error);
        toast.error("Failed to load listing");
      } finally {
        setLoading(false);
      }
    }
    loadListing();
  }, [id, router]);

  async function handleContact() {
    setContacting(true);
    try {
      const res = await fetch(`/api/marketplace/${id}/contact`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Message sent to seller! Redirecting to messages...");
        setTimeout(() => router.push("/messages"), 1000);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to contact seller");
      }
    } finally {
      setContacting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Listing not found</p>
        <Link href="/marketplace">
          <Button className="mt-4">Back to Marketplace</Button>
        </Link>
      </div>
    );
  }

  const isOwnListing = user?.id === listing.seller.id;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/marketplace">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Listing Details
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          <Card className="overflow-hidden">
            <div className="relative h-96 bg-muted">
              {listing.imageUrl ? (
                <Image
                  src={listing.imageUrl}
                  alt={listing.title}
                  fill
                  className="object-contain"
                  priority
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="h-24 w-24 text-muted-foreground/30" />
                </div>
              )}
            </div>
          </Card>

          {/* Details */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h2 className="font-heading text-2xl font-bold">
                    {listing.title}
                  </h2>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant="outline"
                      className={categoryColors[listing.category] || ""}
                    >
                      <Tag className="h-3 w-3 mr-1" />
                      {listing.category.charAt(0) +
                        listing.category.slice(1).toLowerCase()}
                    </Badge>
                    {listing.condition && (
                      <Badge variant="secondary">{listing.condition}</Badge>
                    )}
                    {listing.sold && (
                      <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200">
                        Sold
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold font-heading text-primary">
                    ₹{listing.price}
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Description</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {listing.description || "No description provided"}
                </p>
              </div>

              <Separator />

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>Listed {formatRelativeTime(listing.createdAt)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Seller Info */}
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-semibold">Seller Information</h3>
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={listing.seller.image || undefined} />
                  <AvatarFallback>
                    {listing.seller.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("") || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{listing.seller.name}</p>
                  {listing.seller.uid && (
                    <p className="text-xs text-muted-foreground">
                      @{listing.seller.uid}
                    </p>
                  )}
                </div>
              </div>

              {listing.seller.university && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>{listing.seller.university}</span>
                </div>
              )}

              <Separator />

              {!isOwnListing && !listing.sold && (
                <Button
                  className="w-full"
                  onClick={handleContact}
                  disabled={contacting}
                >
                  {contacting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Contacting...
                    </>
                  ) : (
                    <>
                      <MessageCircle className="mr-2 h-4 w-4" />
                      Contact Seller
                    </>
                  )}
                </Button>
              )}

              {isOwnListing && (
                <div className="text-center text-sm text-muted-foreground">
                  This is your listing
                </div>
              )}

              {listing.sold && !isOwnListing && (
                <div className="text-center text-sm text-muted-foreground">
                  This item has been sold
                </div>
              )}
            </CardContent>
          </Card>

          {/* Safety Tips */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <h3 className="font-semibold text-sm">Safety Tips</h3>
              <ul className="text-xs text-muted-foreground space-y-2">
                <li>• Meet in a public place on campus</li>
                <li>• Inspect the item before payment</li>
                <li>• Don't share personal financial info</li>
                <li>• Report suspicious listings</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
