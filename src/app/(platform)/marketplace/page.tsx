"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import {
  Search,
  Plus,
  ShoppingBag,
  Tag,
  X,
  MessageCircle,
  Loader2,
  Package,
  CheckCircle2,
  Lock,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

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
  const router = useRouter();
  const { user } = useSupabaseUser();
  const userId = user?.id;

  const [tab, setTab] = useState<"browse" | "mine">("browse");
  const [listings, setListings] = useState<Listing[]>([]);
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [myLoading, setMyLoading] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [contactingId, setContactingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    category: "BOOK",
    condition: "GOOD",
  });

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
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
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

  const loadMyListings = useCallback(async () => {
    if (!userId) return;
    setMyLoading(true);
    try {
      const res = await fetch("/api/marketplace?seller=me");
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json();
      setMyListings(data.listings || []);
    } finally {
      setMyLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (tab === "mine") loadMyListings();
  }, [tab, loadMyListings]);

  const filtered = search
    ? listings.filter((l) =>
        l.title.toLowerCase().includes(search.toLowerCase())
      )
    : listings;

  async function handleCreate() {
    if (!form.title || !form.price || !form.category) return;
    setCreating(true);

    let imageUrl: string | null = null;
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", "marketplace");
      const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    }

    const res = await fetch("/api/marketplace", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, imageUrl }),
    });

    if (res.ok) {
      toast.success("Listing created!");
      setShowCreate(false);
      setForm({ title: "", description: "", price: "", category: "BOOK", condition: "GOOD" });
      setFile(null);
      const params = new URLSearchParams();
      if (filter !== "All") params.set("category", filter === "Books" ? "BOOK" : filter === "Gadgets" ? "GADGET" : "SERVICE");
      const listRes = await fetch(`/api/marketplace?${params}`);
      const data = await listRes.json();
      setListings(data.listings || []);
    } else {
      const error = await res.json().catch(() => ({}));
      toast.error(error.error || "Failed to create listing.");
    }
    setCreating(false);
  }

  async function handleContact(listingId: string) {
    setContactingId(listingId);
    try {
      const res = await fetch(`/api/marketplace/${listingId}/contact`, { method: "POST" });
      if (res.ok) {
        toast.success("Message sent to seller! Redirecting to messages...");
        setTimeout(() => router.push("/messages"), 1000);
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to contact seller.");
      }
    } finally {
      setContactingId(null);
    }
  }

  async function handleMarkSold(id: string) {
    const res = await fetch(`/api/marketplace/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sold: true }),
    });
    if (res.ok) {
      toast.success("Marked as sold!");
      setMyListings((prev) => prev.map((l) => l.id === id ? { ...l, sold: true } : l));
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/marketplace/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Listing deleted.");
      setMyListings((prev) => prev.filter((l) => l.id !== id));
    }
  }

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
        {!accessDenied && <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Sell Something
        </Button>}
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
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {!accessDenied && <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setTab("browse")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "browse" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Browse Listings
        </button>
        <button
          onClick={() => setTab("mine")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "mine" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          My Listings
        </button>
      </div>}

      {!accessDenied ? (tab === "browse" ? (
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
                <Button className="mt-4" onClick={() => setShowCreate(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  List the first item!
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((listing) => (
                <Card
                  key={listing.id}
                  className="group overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
                >
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
                    <div className="flex items-center justify-between w-full">
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
                      {listing.seller.id !== userId ? (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleContact(listing.id)}
                          disabled={contactingId === listing.id}
                        >
                          {contactingId === listing.id ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-1" />
                          ) : (
                            <MessageCircle className="h-3.5 w-3.5 mr-1" />
                          )}
                          Buy
                        </Button>
                      ) : (
                        <Badge variant="outline" className="text-xs">Your listing</Badge>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        /* My Listings Tab */
        myLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : myListings.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground">You haven&apos;t listed anything yet.</p>
              <Button className="mt-4" onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                List your first item
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {myListings.map((listing) => (
              <Card key={listing.id} className="hover:border-primary/30 transition-all">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-lg overflow-hidden bg-muted">
                    {listing.imageUrl ? (
                      <Image
                        src={listing.imageUrl}
                        alt=""
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{listing.title}</p>
                      {listing.sold && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-200 text-xs">Sold</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-bold text-primary">₹{listing.price}</span>
                      <Badge variant="outline" className={`text-xs ${categoryColors[listing.category] || ""}`}>
                        {listing.category}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!listing.sold && (
                      <Button size="sm" variant="ghost" onClick={() => handleMarkSold(listing.id)} title="Mark as sold">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      </Button>
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
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )) : null}

      {/* Create Listing Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sell Something</DialogTitle>
            <DialogDescription>
              List a book, gadget, or service for the student community
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Data Structures textbook - Cormen"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => v && setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BOOK">Book</SelectItem>
                    <SelectItem value="GADGET">Gadget</SelectItem>
                    <SelectItem value="SERVICE">Service</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Select value={form.condition} onValueChange={(v) => v && setForm({ ...form, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="LIKE_NEW">Like New</SelectItem>
                    <SelectItem value="GOOD">Good</SelectItem>
                    <SelectItem value="FAIR">Fair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Price (₹)</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your item..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </div>
            <Button onClick={handleCreate} className="w-full" disabled={creating || !form.title || !form.price}>
              {creating ? "Listing..." : "List Item"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
