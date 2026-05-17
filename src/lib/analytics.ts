/**
 * Analytics tracking utilities
 * Ready for integration with PostHog, Plausible, or Google Analytics
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, unknown>;
}

/**
 * Track an analytics event
 * 
 * @example
 * ```ts
 * trackEvent({
 *   name: 'project_created',
 *   properties: {
 *     project_id: '123',
 *     project_type: 'web',
 *   }
 * });
 * ```
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === "undefined") return;

  // Log in development
  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics]", event.name, event.properties);
  }

  // PostHog integration (when configured)
  // if (window.posthog) {
  //   window.posthog.capture(event.name, event.properties);
  // }

  // Plausible integration (when configured)
  // if (window.plausible) {
  //   window.plausible(event.name, { props: event.properties });
  // }

  // Google Analytics 4 (when configured)
  // if (window.gtag) {
  //   window.gtag('event', event.name, event.properties);
  // }
}

/**
 * Track page view
 */
export function trackPageView(url: string): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics] Page view:", url);
  }

  // PostHog
  // if (window.posthog) {
  //   window.posthog.capture('$pageview');
  // }

  // Plausible (automatic)
  // Plausible automatically tracks page views

  // Google Analytics 4
  // if (window.gtag) {
  //   window.gtag('config', 'GA_MEASUREMENT_ID', {
  //     page_path: url,
  //   });
  // }
}

/**
 * Identify user for analytics
 */
export function identifyUser(userId: string, traits?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  if (process.env.NODE_ENV === "development") {
    console.log("[Analytics] Identify user:", userId, traits);
  }

  // PostHog
  // if (window.posthog) {
  //   window.posthog.identify(userId, traits);
  // }
}

/**
 * Common analytics events
 */
export const AnalyticsEvents = {
  // Authentication
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  SIGN_OUT: "sign_out",

  // Projects
  PROJECT_CREATED: "project_created",
  PROJECT_JOINED: "project_joined",
  PROJECT_LEFT: "project_left",
  PROJECT_COMPLETED: "project_completed",

  // Marketplace
  LISTING_CREATED: "listing_created",
  LISTING_VIEWED: "listing_viewed",
  SELLER_APPLIED: "seller_applied",

  // Knowledge Hub
  RESOURCE_UPLOADED: "resource_uploaded",
  RESOURCE_DOWNLOADED: "resource_downloaded",
  RESOURCE_REVIEWED: "resource_reviewed",

  // Study Groups
  STUDY_GROUP_CREATED: "study_group_created",
  STUDY_GROUP_JOINED: "study_group_joined",

  // Startups
  STARTUP_CREATED: "startup_created",
  STARTUP_JOINED: "startup_joined",

  // Messaging
  MESSAGE_SENT: "message_sent",
  CALL_STARTED: "call_started",

  // Engagement
  PROFILE_UPDATED: "profile_updated",
  SEARCH_PERFORMED: "search_performed",
};
