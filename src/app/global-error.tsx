"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
    // In production: Sentry.captureException(error);
  }, [error]);

  return (
    <html>
      <body>
        <div style={{ 
          minHeight: "100vh", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          padding: "1rem",
          fontFamily: "system-ui, sans-serif"
        }}>
          <div style={{ 
            maxWidth: "28rem", 
            width: "100%",
            textAlign: "center",
            padding: "2rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem"
          }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
              Something went wrong
            </h1>
            <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
              We encountered an unexpected error. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ 
                fontSize: "0.75rem", 
                color: "#9ca3af",
                fontFamily: "monospace",
                marginBottom: "1rem"
              }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                padding: "0.5rem 1rem",
                backgroundColor: "#3b82f6",
                color: "white",
                border: "none",
                borderRadius: "0.375rem",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: "500"
              }}
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
