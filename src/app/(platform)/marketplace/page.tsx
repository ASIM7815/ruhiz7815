"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  Search,
  Plus,
  ShoppingBag,
  Tag,
  Package,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface Listing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  category: string;
  condition: string | null;
  imageUrl: string | null;
  sold: boolean;
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

export default function MarketplacePage() {
  const { user } = useSupabaseUser();

  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (filter === "Books") params.set("category", "BOOK");
    if (filter === "Gadgets") params.set("category", "GADGET");
    if (filter === "Services") params.set("category", "SERVICE");
    setAccessDenied(false);
    fetch(`/api/marketplace?${params}`)
      .then((r) => {
        if (r.status === 403) {
          setAccessDenied(true);
          return { listings: [] };
        }
        if (r.status === 401) {
          window.location.href = "/login";
          return { listings: [] };
        }
        if (!r.ok) {
          console.error(`Failed to load marketplace: HTTP ${r.status}`);
          return { listings: [] };
        }
        return r.json();
      })
      .then((data) => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load marketplace:", err);
        setListings([]);
        setLoading(false);
      });
  }, [filter]);

  const filtered = search
    ? listings.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Student Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell books, gadgets, and services
          </p>
        </div>
        {!accessDenied && (
          <Link href="/marketplace/create">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Sell Something
            </Button>
          </Link>
        )}
      </div>

      {accessDenied && (
        <Card>
          <CardContent className="p-10 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Lock className="h-5 w-5 text-muted-foreground" />
            </div>
            <h2 className="font-heading text-xl font-semibold">Marketplace Access Restricted</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Marketplace access is separate from project membership and is not enabled for this account.
            </p>
            <Link href="/marketplace/apply-seller">
              <Button className="mt-4">Apply to Become a Seller</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {!accessDenied && <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-background text-foreground shadow-sm"
        >
          Browse Listings
        </button>
        <Link href="/marketplace/my-listings">
          <button
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-muted-foreground hover:text-foreground"
          >
            My Listings
          </button>
        </Link>
      </div>}

      {!accessDenied ? (
        <>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search listings..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              {["All", "Books", "Gadgets", "Services"].map((cat) => (
                <Badge
                  key={cat}
                  variant={filter === cat ? "default" : "outline"}
                  className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
                  onClick={() => setFilter(cat)}
                >
                  {cat}
                </Badge>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-64 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No listings yet.</p>
                <Link href="/marketplace/create">
                  <Button className="mt-4">
                    <Plus className="mr-2 h-4 w-4" />
                    List the first item!
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((listing) => (
                <Link key={listing.id} href={`/marketplace/${listing.id}`}>
                  <Card className="group overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all cursor-pointer">
                    <div className="relative h-48 overflow-hidden bg-muted">
                      {listing.imageUrl ? (
                        <Image
                          src={listing.imageUrl}
                          alt={listing.title}
                          fill
                          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-16 w-16 text-muted-foreground/30" />
                        </div>
                      )}
                      <Badge
                        variant="outline"
                        className={`absolute top-3 left-3 ${categoryColors[listing.category] || ""}`}
                      >
                        <Tag className="h-3 w-3 mr-1" />
                        {listing.category.charAt(0) + listing.category.slice(1).toLowerCase()}
                      </Badge>
                    </div>

                    <CardContent className="p-4">
                      <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                        {listing.title}
                      </h3>
                      {listing.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{listing.description}</p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-2xl font-bold font-heading text-primary">
                          ₹{listing.price}
                        </span>
                        {listing.condition && (
                          <Badge variant="secondary" className="text-xs">
                            {listing.condition}
                          </Badge>
                        )}
                      </div>
                    </CardContent>

                    <CardFooter className="px-4 pb-4 pt-0">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={listing.seller.image || undefined} />
                          <AvatarFallback>
                            {listing.seller.name?.split(" ").map((n: string) => n[0]).join("") || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-xs font-medium">{listing.seller.name}</p>
                          <p className="text-[10px] text-muted-foreground">{listing.seller.university || ""}</p>
                        </div>
                      </div>
                    </CardFooter>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
