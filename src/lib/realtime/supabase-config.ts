/**
 * Supabase Realtime Configuration
 * 
 * This file contains the configuration for Supabase Realtime features.
 * It defines the tables that are enabled for real-time subscriptions
 * and the configuration parameters for the Realtime client.
 */

import { RealtimeChannelOptions } from "@supabase/supabase-js";

/**
 * Tables enabled for Realtime subscriptions
 */
export const REALTIME_TABLES = {
  MESSAGES: "messages",
  DIRECT_MESSAGES: "direct_messages",
  GROUP_MESSAGES: "group_messages",
  JOIN_REQUESTS: "join_requests",
  PROJECT_MEMBERS: "project_members",
  STUDY_GROUP_MEMBERS: "study_group_members",
  PROJECTS: "projects",
  STUDY_GROUPS: "study_groups",
  NOTIFICATIONS: "notifications",
} as const;

/**
 * Realtime client configuration
 */
export const REALTIME_CONFIG = {
  /**
   * Maximum events per second per client
   * Prevents overwhelming the client with too many updates
   */
  eventsPerSecond: 10,

  /**
   * Heartbeat interval in milliseconds
   * How often to send ping to keep connection alive
   */
  heartbeatIntervalMs: 30000, // 30 seconds

  /**
   * Timeout for receiving heartbeat response
   */
  heartbeatTimeoutMs: 10000, // 10 seconds

  /**
   * Reconnection configuration
   */
  reconnect: {
    /**
     * Maximum number of reconnection attempts
     */
    maxAttempts: 3,

    /**
     * Exponential backoff intervals in milliseconds
     * [1s, 2s, 4s, 8s, 16s max]
     */
    backoffIntervals: [1000, 2000, 4000, 8000, 16000],
  },

  /**
   * Event batching configuration
   */
  batching: {
    /**
     * Batching window in milliseconds
     * Events within this window are batched together
     */
    windowMs: 100,

    /**
     * Maximum batch size
     */
    maxBatchSize: 50,
  },

  /**
   * Performance thresholds
   */
  performance: {
    /**
     * Target latency in milliseconds
     * Time from database change to UI update
     */
    targetLatencyMs: 500,

    /**
     * Target UI render time in milliseconds
     */
    targetRenderTimeMs: 100,

    /**
     * High-frequency update threshold (events per second)
     * Above this, throttling is applied
     */
    highFrequencyThreshold: 10,
  },

  /**
   * Cache configuration
   */
  cache: {
    /**
     * Maximum cache size in bytes
     * Desktop: 10MB, Mobile: 5MB (adjusted at runtime)
     */
    maxSizeBytes: 10 * 1024 * 1024, // 10MB

    /**
     * Default TTL for cached items in milliseconds
     */
    defaultTtlMs: 5 * 60 * 1000, // 5 minutes
  },
} as const;

/**
 * Default channel options for Realtime subscriptions
 */
export const DEFAULT_CHANNEL_OPTIONS: RealtimeChannelOptions = {
  config: {
    broadcast: {
      ack: false,
      self: false,
    },
    presence: {
      key: "",
    },
  },
};

/**
 * Get Realtime configuration for mobile devices
 * Adjusts settings for better mobile performance
 */
export function getMobileRealtimeConfig() {
  return {
    ...REALTIME_CONFIG,
    batching: {
      ...REALTIME_CONFIG.batching,
      windowMs: 200, // Increased batching window for mobile
    },
    cache: {
      ...REALTIME_CONFIG.cache,
      maxSizeBytes: 5 * 1024 * 1024, // 5MB for mobile
    },
  };
}

/**
 * Check if running on mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * Get appropriate Realtime configuration based on device
 */
export function getRealtimeConfig() {
  return isMobileDevice() ? getMobileRealtimeConfig() : REALTIME_CONFIG;
}
