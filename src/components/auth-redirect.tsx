"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AuthRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Check if there's a stored redirect URL
    const redirectUrl = sessionStorage.getItem("auth_redirect");
    
    if (redirectUrl) {
      // Clear the stored redirect
      sessionStorage.removeItem("auth_redirect");
      
      // Redirect to the original page
      console.log("[AuthRedirect] Redirecting to:", redirectUrl);
      router.push(redirectUrl);
    } else {
      // Default redirect to dashboard
      router.push("/dashboard");
    }
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing login...</p>
      </div>
    </div>
  );
}
