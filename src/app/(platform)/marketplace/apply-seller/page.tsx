"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSupabaseUser } from "@/hooks/use-supabase-user";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export default function ApplySellerPage() {
  const router = useRouter();
  const { user } = useSupabaseUser();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    reason: "",
    portfolio: "",
    idVerification: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!form.reason.trim()) {
      toast.error("Please provide a reason for selling");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/marketplace/apply-seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        toast.success("Application submitted! Admins will review your request.");
        setTimeout(() => router.push("/marketplace"), 1500);
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to submit application");
      }
    } catch (error) {
      console.error("Application error:", error);
      toast.error("Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">Please log in to apply as a seller</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/marketplace">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="font-heading text-2xl md:text-3xl font-bold">
            Apply to Sell
          </h1>
          <p className="text-muted-foreground mt-1">
            Get verified to start selling on the marketplace
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Seller Application</CardTitle>
          <CardDescription>
            Tell us why you want to sell and provide verification details. 
            Admins will review your application within 24-48 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="reason">
                Why do you want to sell? <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="reason"
                placeholder="e.g., I have textbooks and gadgets I no longer need and want to help fellow students..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
                rows={4}
                required
              />
              <p className="text-xs text-muted-foreground">
                Explain your motivation for selling on the platform
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="portfolio">
                Portfolio / Previous Experience (Optional)
              </Label>
              <Textarea
                id="portfolio"
                placeholder="e.g., Links to previous sales, social media, or any relevant experience..."
                value={form.portfolio}
                onChange={(e) => setForm({ ...form, portfolio: e.target.value })}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Share any relevant selling experience or links
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="idVerification">
                Student ID / Verification (Optional)
              </Label>
              <Input
                id="idVerification"
                placeholder="e.g., Student ID number, university email, etc."
                value={form.idVerification}
                onChange={(e) => setForm({ ...form, idVerification: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Helps us verify you're a legitimate student seller
              </p>
            </div>

            <div className="bg-muted/50 border border-border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">What happens next?</h3>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Your application will be reviewed by admins</li>
                <li>• You'll receive a notification once approved</li>
                <li>• Approval typically takes 24-48 hours</li>
                <li>• Once approved, you can start listing items</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || !form.reason.trim()}
                className="flex-1"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Submit Application
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
