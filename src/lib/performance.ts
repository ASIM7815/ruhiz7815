/**
 * Performance monitoring utilities
 * In production, these would send metrics to a service like Vercel Analytics or PostHog
 */

export function reportWebVitals(metric: {
  id: string;
  name: string;
  value: number;
  label: "web-vital" | "custom";
}) {
  // Log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${metric.name}:`, metric.value);
  }

  // In production, send to analytics service
  // Example: analytics.track('web-vital', metric);
  
  // For Vercel Analytics:
  // if (window.va) {
  //   window.va('event', {
  //     name: metric.name,
  //     data: {
  //       value: metric.value,
  //       id: metric.id,
  //       label: metric.label,
  //     },
  //   });
  // }
}

export function measurePageLoad() {
  if (typeof window === "undefined") return;

  window.addEventListener("load", () => {
    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const connectTime = perfData.responseEnd - perfData.requestStart;
    const renderTime = perfData.domComplete - perfData.domLoading;

    if (process.env.NODE_ENV === "development") {
      console.log("[Performance] Page Load Metrics:", {
        pageLoadTime: `${pageLoadTime}ms`,
        connectTime: `${connectTime}ms`,
        renderTime: `${renderTime}ms`,
      });
    }

    // In production, send to analytics
    // analytics.track('page-load', { pageLoadTime, connectTime, renderTime });
  });
}

export function trackAPICall(endpoint: string, duration: number, status: number) {
  if (process.env.NODE_ENV === "development") {
    console.log(`[API] ${endpoint}: ${duration}ms (${status})`);
  }

  // In production, send to analytics
  // analytics.track('api-call', { endpoint, duration, status });
}
