"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { marketingNav } from "@/config/nav";
import Image from "next/image";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300 safe-area-inset-top",
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 touch-manipulation active:scale-95 transition-transform">
            <Image src="/logo.png" alt="RUHIZ" width={36} height={36} className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg object-cover" />
            <span className="font-heading text-lg sm:text-xl font-bold tracking-tight">
              RUHIZ
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 lg:gap-8">
            {marketingNav.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {item.title}
              </Link>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" size="sm" render={<Link href="/login" />}>Log In</Button>
            <Button size="sm" render={<Link href="/register" />}>Get Started</Button>
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger 
              render={<Button variant="ghost" size="icon" className="touch-manipulation active:scale-95 transition-transform" />} 
              className="md:hidden"
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[85vw] max-w-sm safe-area-inset">
              <div className="flex flex-col gap-6 mt-8">
                <Link href="/" className="flex items-center gap-2 touch-manipulation active:scale-95 transition-transform">
                  <Image src="/logo.png" alt="RUHIZ" width={36} height={36} className="h-9 w-9 rounded-lg object-cover" />
                  <span className="font-heading text-xl font-bold">RUHIZ</span>
                </Link>
                <div className="flex flex-col gap-4">
                  {marketingNav.map((item) => (
                    <Link
                      key={item.title}
                      href={item.href}
                      className="text-lg font-medium text-muted-foreground hover:text-foreground active:text-foreground transition-colors touch-manipulation py-2"
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
                <div className="flex flex-col gap-3 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    render={<Link href="/login" />}
                    className="touch-manipulation active:scale-95 transition-transform"
                  >
                    Log In
                  </Button>
                  <Button 
                    render={<Link href="/register" />}
                    className="touch-manipulation active:scale-95 transition-transform"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
