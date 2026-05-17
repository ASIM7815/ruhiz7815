"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, XCircle, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

type SellerApplication = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  marketplaceStatus: string;
  createdAt: string;
};

type Listing = {
  id: string;
  title: string;
  price: number;
  category: string;
  status: string;
  imageUrl: string | null;
  seller: {
    id: string;
    name: string;
  };
  createdAt: string;
};

export default function AdminMarketplacePage() {
  const [applications, setApplications] = useState<SellerApplication[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [usersRes, listingsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/marketplace"),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        const pending = data.users.filter(
          (u: SellerApplication) => u.marketplaceStatus === "PENDING_REVIEW"
        );
        setApplications(pending);
      }

      if (listingsRes.ok) {
        const data = await listingsRes.json();
        setListings(data.listings || []);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleApplication(userId: string, approve: boolean) {
    setActionLoading(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketplaceStatus: approve ? "ACTIVE" : "DISABLED",
          marketplaceRole: approve ? "SELLER" : "NONE",
        }),
      });

      if (res.ok) {
        setApplications((prev) => prev.filter((a) => a.id !== userId));
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function updateListingStatus(listingId: string, status: string) {
    setActionLoading(listingId);
    try {
      const res = await fetch(`/api/marketplace/${listingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        setListings((prev) =>
          prev.map((l) => (l.id === listingId ? { ...l, status } : l))
        );
      }
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketplace</h1>
        <p className="text-muted-foreground">Manage seller applications and listings</p>
      </div>

      <Tabs defaultValue="applications">
        <TabsList>
          <TabsTrigger value="applications">
            Seller Applications
            {applications.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {applications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="listings">Listings</TabsTrigger>
        </TabsList>

        <TabsContent value="applications" className="space-y-4">
          {applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No pending applications</p>
              </CardContent>
            </Card>
          ) : (
            applications.map((app) => (
              <Card key={app.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={app.image || undefined} />
                      <AvatarFallback>{app.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">{app.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Applied {new Date(app.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApplication(app.id, true)}
                        disabled={actionLoading === app.id}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        {actionLoading === app.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Approve
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleApplication(app.id, false)}
                        disabled={actionLoading === app.id}
                        className="text-destructive"
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="listings" className="space-y-4">
          {listings.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No listings found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {listings.map((listing) => (
                <Card key={listing.id}>
                  <CardContent className="p-4">
                    {listing.imageUrl && (
                      <img
                        src={listing.imageUrl}
                        alt={listing.title}
                        className="w-full h-40 object-cover rounded-lg mb-3"
                      />
                    )}
                    <h3 className="font-semibold truncate mb-1">{listing.title}</h3>
                    <p className="text-lg font-bold text-primary mb-2">
                      ${listing.price.toFixed(2)}
                    </p>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary">{listing.category}</Badge>
                      <Badge
                        variant={
                          listing.status === "ACTIVE"
                            ? "default"
                            : listing.status === "UNDER_REVIEW"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {listing.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      By {listing.seller.name}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        render={<Link href={`/marketplace/${listing.id}`} target="_blank" />}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {listing.status === "UNDER_REVIEW" && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => updateListingStatus(listing.id, "ACTIVE")}
                            disabled={actionLoading === listing.id}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateListingStatus(listing.id, "REMOVED")}
                            disabled={actionLoading === listing.id}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        </>
                      )}
                      {listing.status === "ACTIVE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateListingStatus(listing.id, "HIDDEN")}
                          disabled={actionLoading === listing.id}
                        >
                          Hide
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
