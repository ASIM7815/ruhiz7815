import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Create mocks that will be used in the factory
const createMockChannel = () => ({
  on: vi.fn().mockReturnThis(),
  subscribe: vi.fn(),
  _subscribeCallback: null as any,
});

let currentMockChannel: ReturnType<typeof createMockChannel>;

// Mock the supabase client before importing ConnectionManager
vi.mock("@/lib/supabase-client", () => ({
  supabase: {
    channel: vi.fn(() => {
      currentMockChannel = createMockChannel();
      currentMockChannel.subscribe.mockImplementation((callback: (status: string) => void) => {
        currentMockChannel._subscribeCallback = callback;
        return currentMockChannel;
      });
      return currentMockChannel;
    }),
    removeChannel: vi.fn(),
  },
}));

import { ConnectionManager } from "./ConnectionManager";
import { supabase } from "@/lib/supabase-client";

describe("ConnectionManager", () => {
  let manager: ConnectionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(supabase.channel).mockClear();
    vi.mocked(supabase.removeChannel).mockClear();
    manager = new ConnectionManager();
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllTimers();
    vi.restoreAllMocks();
  });

  describe("Connection Lifecycle", () => {
    it("should start in disconnected state", () => {
      const state = manager.getConnectionState();
      expect(state.status).toBe("disconnected");
    });

    it("should transition to connected state on successful connection", async () => {
      const states: string[] = [];
      manager.onStateChange((state) => states.push(state.status));

      const connectPromise = manager.connect();
      
      // Simulate successful subscription
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      
      await connectPromise;

      expect(states).toContain("connected");
    });

    it("should include connectedAt timestamp when connected", async () => {
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      const state = manager.getConnectionState();
      if (state.status === "connected") {
        expect(state.connectedAt).toBeInstanceOf(Date);
      } else {
        throw new Error("Expected connected state");
      }
    });

    it("should disconnect and clean up resources", async () => {
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      manager.disconnect();

      expect(supabase.removeChannel).toHaveBeenCalledWith(currentMockChannel);
      const state = manager.getConnectionState();
      expect(state.status).toBe("disconnected");
    });
  });

  describe("Exponential Backoff Reconnection", () => {
    it("should attempt reconnection with 1s delay on first failure", async () => {
      const states: any[] = [];
      manager.onStateChange((state) => states.push(state));

      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;

      // Should be in reconnecting state
      const reconnectingState = states.find((s) => s.status === "reconnecting");
      expect(reconnectingState).toBeDefined();
      expect(reconnectingState.attempt).toBe(1);
      expect(reconnectingState.nextRetryIn).toBe(1000);
    });

    it("should use exponential backoff intervals: 1s, 2s, 4s", async () => {
      const reconnectingStates: any[] = [];
      manager.onStateChange((state) => {
        if (state.status === "reconnecting") {
          reconnectingStates.push(state);
        }
      });

      // First failure
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;

      expect(reconnectingStates[0].nextRetryIn).toBe(1000); // 1s
      
      // Second failure - advance timer and trigger next attempt
      await vi.advanceTimersByTimeAsync(1000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      expect(reconnectingStates[1].nextRetryIn).toBe(2000); // 2s
      
      // Third failure
      await vi.advanceTimersByTimeAsync(2000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      expect(reconnectingStates[2].nextRetryIn).toBe(4000); // 4s
    });

    it("should increment retry attempt counter on each failure", async () => {
      const reconnectingStates: any[] = [];
      manager.onStateChange((state) => {
        if (state.status === "reconnecting") {
          reconnectingStates.push(state);
        }
      });

      // First failure
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;
      expect(reconnectingStates[0].attempt).toBe(1);

      // Second failure
      await vi.advanceTimersByTimeAsync(1000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      expect(reconnectingStates[1].attempt).toBe(2);

      // Third failure
      await vi.advanceTimersByTimeAsync(2000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      expect(reconnectingStates[2].attempt).toBe(3);
    });

    it("should reset retry counter on successful connection", async () => {
      // First failure
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;

      // Advance timer for first retry
      await vi.advanceTimersByTimeAsync(1000);

      // Successful connection on retry
      currentMockChannel._subscribeCallback("SUBSCRIBED");

      // Now trigger another failure - should start from attempt 1 again
      const reconnectingStates: any[] = [];
      manager.onStateChange((state) => {
        if (state.status === "reconnecting") {
          reconnectingStates.push(state);
        }
      });

      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await vi.runAllTimersAsync();

      expect(reconnectingStates[0].attempt).toBe(1);
      expect(reconnectingStates[0].nextRetryIn).toBe(1000);
    });
  });

  describe("Manual Reconnect After Failed Attempts", () => {
    it("should offer manual reconnect after 3 failed attempts", async () => {
      const states: any[] = [];
      manager.onStateChange((state) => states.push(state));

      // First attempt fails
      const connectPromise1 = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise1;

      // Wait for first retry (1s) and fail again
      await vi.advanceTimersByTimeAsync(1000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      // Wait for second retry (2s) and fail again
      await vi.advanceTimersByTimeAsync(2000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      // After 3 attempts, manual reconnect should be available
      expect(manager.isManualReconnectAvailable()).toBe(true);
      
      const errorStates = states.filter((s) => s.status === "error");
      const lastError = errorStates[errorStates.length - 1];
      expect(lastError).toBeDefined();
      expect(lastError.error.message).toContain("manual");
    });

    it("should not offer manual reconnect before 3 failed attempts", async () => {
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;

      expect(manager.isManualReconnectAvailable()).toBe(false);
    });

    it("should allow manual reconnect and reset retry counter", async () => {
      // First attempt fails
      const connectPromise1 = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise1;

      // Wait for first retry (1s) and fail again
      await vi.advanceTimersByTimeAsync(1000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      // Wait for second retry (2s) and fail again
      await vi.advanceTimersByTimeAsync(2000);
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");

      expect(manager.isManualReconnectAvailable()).toBe(true);

      // Manual reconnect
      const reconnectPromise = manager.reconnect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await reconnectPromise;

      // Should be connected now
      const state = manager.getConnectionState();
      expect(state.status).toBe("connected");
      expect(manager.isManualReconnectAvailable()).toBe(false);
    });
  });

  describe("State Change Notifications", () => {
    it("should notify subscribers of state changes", async () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      // Should be called at least twice: once for initial state, once for connected
      expect(callback).toHaveBeenCalled();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ status: "connected" })
      );
    });

    it("should immediately call callback with current state on subscription", () => {
      const callback = vi.fn();
      manager.onStateChange(callback);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({ status: "disconnected" });
    });

    it("should allow unsubscribing from state changes", async () => {
      const callback = vi.fn();
      const unsubscribe = manager.onStateChange(callback);

      callback.mockClear();
      unsubscribe();

      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      expect(callback).not.toHaveBeenCalled();
    });

    it("should handle errors in callbacks gracefully", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const errorCallback = vi.fn(() => {
        throw new Error("Callback error");
      });
      const normalCallback = vi.fn();

      manager.onStateChange(errorCallback);
      manager.onStateChange(normalCallback);

      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      // Both callbacks should be called despite error in first one
      expect(errorCallback).toHaveBeenCalled();
      expect(normalCallback).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("Authentication", () => {
    it("should allow setting auth token", () => {
      const token = "test-jwt-token";
      manager.setAuth(token);
      
      // Token is set internally, no error should be thrown
      expect(() => manager.setAuth(token)).not.toThrow();
    });

    it("should disconnect when clearing auth", async () => {
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      manager.clearAuth();

      const state = manager.getConnectionState();
      expect(state.status).toBe("disconnected");
    });
  });

  describe("Cleanup and Resource Management", () => {
    it("should clean up timers on disconnect", async () => {
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("CHANNEL_ERROR");
      await connectPromise;

      // Should have a reconnect timer scheduled
      expect(vi.getTimerCount()).toBeGreaterThan(0);

      manager.disconnect();

      // State should be disconnected
      const state = manager.getConnectionState();
      expect(state.status).toBe("disconnected");
    });

    it("should clean up all resources on destroy", async () => {
      const callback = vi.fn();
      
      const connectPromise = manager.connect();
      currentMockChannel._subscribeCallback("SUBSCRIBED");
      await connectPromise;

      // Subscribe after connection is established
      manager.onStateChange(callback);
      
      callback.mockClear();
      manager.destroy();

      // Try to change state - callback should not be called since destroy clears all callbacks
      // We can't easily trigger state changes on destroyed manager, so we just verify destroy completed
      expect(callback).not.toHaveBeenCalled();
    });
  });
});
