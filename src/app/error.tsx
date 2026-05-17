"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console in development
    console.error("Application error:", error);
    
    // In production, you would send this to an error tracking service like Sentry
    // Example: Sentry.captureException(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <h1 className="font-heading text-2xl font-bold">Something went wrong</h1>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-muted-foreground">
            We encountered an unexpected error. Our team has been notified and is working on a fix.
          </p>
          {error.digest && (
            <p className="text-xs text-muted-foreground font-mono bg-muted px-3 py-2 rounded">
              Error ID: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center pt-2">
            <Button onClick={reset} variant="default">
              Try again
            </Button>
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              Go home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
