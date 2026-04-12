import Link from "next/link";
import {
  Search,
  Plus,
  ShoppingBag,
  Tag,
  MapPin,
  ArrowRight,
  Filter,
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

const listings: {
  id: string;
  title: string;
  category: string;
  price: number;
  condition: string;
  image: string;
  seller: { name: string; avatar: string; university: string };
}[] = [];

const categoryColors: Record<string, string> = {
  BOOK: "bg-blue-500/10 text-blue-600 border-blue-200",
  GADGET: "bg-purple-500/10 text-purple-600 border-purple-200",
  SERVICE: "bg-emerald-500/10 text-emerald-600 border-emerald-200",
};

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Student Marketplace
          </h1>
          <p className="text-muted-foreground mt-1">
            Buy and sell books, gadgets, and services within the student
            community
          </p>
        </div>
        <Button render={<Link href="/marketplace/create" />}>
            <Plus className="mr-2 h-4 w-4" />
            Sell Something
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["All", "Books", "Gadgets", "Services"].map((cat) => (
            <Badge
              key={cat}
              variant={cat === "All" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 px-4 py-1.5"
            >
              {cat}
            </Badge>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card
            key={listing.id}
            className="group overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all"
          >
            {/* Image */}
            <div className="relative h-48 overflow-hidden bg-muted">
              <img
                src={listing.image}
                alt={listing.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <Badge
                variant="outline"
                className={`absolute top-3 left-3 ${categoryColors[listing.category]}`}
              >
                {listing.category.charAt(0) +
                  listing.category.slice(1).toLowerCase()}
              </Badge>
            </div>

            <CardContent className="p-4">
              <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                {listing.title}
              </h3>
              <div className="flex items-center justify-between mt-3">
                <span className="text-2xl font-bold font-heading text-primary">
                  ${listing.price}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {listing.condition}
                </Badge>
              </div>
            </CardContent>

            <CardFooter className="px-4 pb-4 pt-0">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={listing.seller.avatar} />
                    <AvatarFallback>
                      {listing.seller.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-medium">
                      {listing.seller.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {listing.seller.university}
                    </p>
                  </div>
                </div>
                <Button variant="default" size="sm">
                  Contact
                </Button>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
}
