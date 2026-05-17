/**
 * Application monitoring and health check utilities
 */

export interface HealthCheckResult {
  status: "healthy" | "degraded" | "unhealthy";
  checks: {
    database: boolean;
    supabase: boolean;
    gcs: boolean;
  };
  timestamp: string;
}

/**
 * Perform health check on all critical services
 */
export async function performHealthCheck(): Promise<HealthCheckResult> {
  const checks = {
    database: await checkDatabase(),
    supabase: await checkSupabase(),
    gcs: await checkGCS(),
  };

  const allHealthy = Object.values(checks).every((check) => check === true);
  const someHealthy = Object.values(checks).some((check) => check === true);

  return {
    status: allHealthy ? "healthy" : someHealthy ? "degraded" : "unhealthy",
    checks,
    timestamp: new Date().toISOString(),
  };
}

async function checkDatabase(): Promise<boolean> {
  try {
    // Simple query to check database connectivity
    const response = await fetch("/api/debug-db", { method: "GET" });
    return response.ok;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

async function checkSupabase(): Promise<boolean> {
  try {
    // Check if Supabase is accessible
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) return false;

    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: "HEAD",
    });
    return response.status !== 500;
  } catch (error) {
    console.error("Supabase health check failed:", error);
    return false;
  }
}

async function checkGCS(): Promise<boolean> {
  try {
    // Check if GCS is accessible
    const response = await fetch("/api/test-gcs", { method: "GET" });
    return response.ok;
  } catch (error) {
    console.error("GCS health check failed:", error);
    return false;
  }
}

/**
 * Log application error with context
 */
export function logError(
  error: Error,
  context?: Record<string, unknown>
): void {
  console.error("[Error]", error.message, {
    stack: error.stack,
    ...context,
  });

  // In production, send to error tracking service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureException(error, {
  //     extra: context,
  //   });
  // }
}

/**
 * Log application warning
 */
export function logWarning(
  message: string,
  context?: Record<string, unknown>
): void {
  console.warn("[Warning]", message, context);

  // In production, send to monitoring service
  // if (typeof window !== 'undefined' && window.Sentry) {
  //   window.Sentry.captureMessage(message, {
  //     level: 'warning',
  //     extra: context,
  //   });
  // }
}

/**
 * Log application info
 */
export function logInfo(
  message: string,
  context?: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "development") {
    console.log("[Info]", message, context);
  }

  // In production, send to logging service
  // analytics.track('info', { message, ...context });
}
