import { supabase } from "@/lib/supabase-client";
import type { RealtimeChannel } from "@supabase/supabase-js";

/**
 * Connection state representing the current status of the WebSocket connection
 */
export type ConnectionState =
  | { status: "connected"; connectedAt: Date }
  | { status: "disconnected"; reason?: string }
  | { status: "reconnecting"; attempt: number; nextRetryIn: number }
  | { status: "error"; error: Error };

export type Unsubscribe = () => void;

type StateChangeCallback = (state: ConnectionState) => void;

/**
 * ConnectionManager manages the WebSocket connection lifecycle, authentication, and reconnection logic.
 * It implements exponential backoff for reconnection attempts and notifies subscribers of state changes.
 */
export class ConnectionManager {
  private state: ConnectionState = { status: "disconnected" };
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  private authToken: string | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private channel: RealtimeChannel | null = null;
  private maxRetryAttempts = 3;
  private currentRetryAttempt = 0;
  
  // Exponential backoff intervals: 1s, 2s, 4s, 8s, 16s max
  private readonly backoffIntervals = [1000, 2000, 4000, 8000, 16000];
  
  // Flag to track if manual reconnect is available
  private manualReconnectAvailable = false;

  constructor() {
    if (typeof window !== "undefined") {
      // Listen to online/offline events
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
    }
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): ConnectionState {
    return this.state;
  }

  /**
   * Subscribe to connection state changes
   * @param callback - Function to call when state changes
   * @returns Unsubscribe function
   */
  onStateChange(callback: StateChangeCallback): Unsubscribe {
    this.stateChangeCallbacks.add(callback);
    // Immediately call with current state
    callback(this.state);
    
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Set the authentication token for the connection
   * @param token - JWT token for authentication
   */
  setAuth(token: string): void {
    this.authToken = token;
  }

  /**
   * Clear the authentication token
   */
  clearAuth(): void {
    this.authToken = null;
    this.disconnect();
  }

  /**
   * Connect to the Realtime service
   */
  async connect(): Promise<void> {
    if (this.state.status === "connected") {
      return;
    }

    try {
      // Create a channel for health monitoring
      this.channel = supabase.channel("connection-health");
      
      // Set up event listeners
      this.channel
        .on("system" as any, {}, (payload: any) => {
          // Handle system events if needed
          console.log("System event:", payload);
        })
        .subscribe((status) => {
          if (status === "SUBSCRIBED") {
            this.handleConnected();
          } else if (status === "CHANNEL_ERROR") {
            this.handleConnectionError(new Error("Channel subscription error"));
          } else if (status === "TIMED_OUT") {
            this.handleConnectionError(new Error("Connection timed out"));
          } else if (status === "CLOSED") {
            this.handleDisconnected("Connection closed");
          }
        });
    } catch (error) {
      this.handleConnectionError(
        error instanceof Error ? error : new Error("Unknown connection error")
      );
    }
  }

  /**
   * Disconnect from the Realtime service
   */
  disconnect(): void {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
    
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.setState({ status: "disconnected" });
    this.currentRetryAttempt = 0;
    this.manualReconnectAvailable = false;
  }

  /**
   * Manually reconnect to the Realtime service
   * This is available after max retry attempts have been reached
   */
  async reconnect(): Promise<void> {
    // Clear any existing reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    // Reset retry attempt counter
    this.currentRetryAttempt = 0;
    this.manualReconnectAvailable = false;
    
    // Disconnect current connection if any
    this.disconnect();
    
    // Attempt to connect
    await this.connect();
  }

  /**
   * Check if manual reconnect is available
   */
  isManualReconnectAvailable(): boolean {
    return this.manualReconnectAvailable;
  }

  /**
   * Handle successful connection
   */
  private handleConnected(): void {
    this.currentRetryAttempt = 0;
    this.manualReconnectAvailable = false;
    this.setState({ status: "connected", connectedAt: new Date() });
  }

  /**
   * Handle disconnection
   */
  private handleDisconnected(reason?: string): void {
    this.setState({ status: "disconnected", reason });
    
    // Attempt automatic reconnection
    this.attemptReconnection();
  }

  /**
   * Handle connection error
   */
  private handleConnectionError(error: Error): void {
    this.setState({ status: "error", error });
    
    // Attempt automatic reconnection
    this.attemptReconnection();
  }

  /**
   * Attempt reconnection with exponential backoff
   */
  private attemptReconnection(): void {
    // Check if we've exceeded max retry attempts
    if (this.currentRetryAttempt >= this.maxRetryAttempts) {
      // Enable manual reconnect option
      this.manualReconnectAvailable = true;
      this.setState({
        status: "error",
        error: new Error(
          `Failed to reconnect after ${this.maxRetryAttempts} attempts. Please try reconnecting manually.`
        ),
      });
      return;
    }

    // Get the backoff interval for the current attempt
    // Use the last interval (16s) if we exceed the array length
    const backoffIndex = Math.min(
      this.currentRetryAttempt,
      this.backoffIntervals.length - 1
    );
    const retryDelay = this.backoffIntervals[backoffIndex];

    // Update state to show reconnecting
    this.setState({
      status: "reconnecting",
      attempt: this.currentRetryAttempt + 1,
      nextRetryIn: retryDelay,
    });

    // Schedule reconnection attempt
    this.reconnectTimer = setTimeout(async () => {
      this.currentRetryAttempt++;
      
      try {
        await this.connect();
      } catch (error) {
        // If connection fails, attemptReconnection will be called again
        // from handleConnectionError
        console.error("Reconnection attempt failed:", error);
      }
    }, retryDelay);
  }

  /**
   * Handle browser coming back online
   */
  private handleOnline = (): void => {
    if (this.state.status === "disconnected" || this.state.status === "error") {
      this.reconnect();
    }
  };

  /**
   * Handle browser going offline
   */
  private handleOffline = (): void => {
    this.handleDisconnected("Network offline");
  };

  /**
   * Update the connection state and notify subscribers
   */
  private setState(newState: ConnectionState): void {
    this.state = newState;
    
    // Notify all subscribers
    this.stateChangeCallbacks.forEach((callback) => {
      try {
        callback(newState);
      } catch (error) {
        console.error("Error in state change callback:", error);
      }
    });
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
    }
    
    this.disconnect();
    this.stateChangeCallbacks.clear();
  }
}

// Singleton instance
let connectionManagerInstance: ConnectionManager | null = null;

/**
 * Get the singleton ConnectionManager instance
 */
export function getConnectionManager(): ConnectionManager {
  if (!connectionManagerInstance) {
    connectionManagerInstance = new ConnectionManager();
  }
  return connectionManagerInstance;
}
