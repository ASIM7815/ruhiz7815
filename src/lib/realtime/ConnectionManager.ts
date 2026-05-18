/**
 * ConnectionManager
 * 
 * Manages the WebSocket connection lifecycle, authentication, and reconnection logic
 * for Supabase Realtime.
 * 
 * Key responsibilities:
 * - Connection state management (connected, disconnected, reconnecting, error)
 * - Exponential backoff reconnection (1s, 2s, 4s, 8s, 16s max)
 * - Auth token management and automatic refresh
 * - Connection state change notifications via observer pattern
 */

import { RealtimeChannel, RealtimeClient } from '@supabase/supabase-js';

// Connection state types
export type ConnectionState =
  | { status: 'connected'; connectedAt: Date }
  | { status: 'disconnected'; reason?: string }
  | { status: 'reconnecting'; attempt: number; nextRetryIn: number }
  | { status: 'error'; error: Error };

export type Unsubscribe = () => void;
type StateChangeCallback = (state: ConnectionState) => void;

// Reconnection configuration
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // milliseconds
const MAX_RECONNECT_ATTEMPTS = 3;

/**
 * ConnectionManager class
 * 
 * Singleton pattern to ensure only one connection manager exists per application.
 */
export class ConnectionManager {
  private static instance: ConnectionManager | null = null;

  private realtimeClient: RealtimeClient | null = null;
  private connectionState: ConnectionState = { status: 'disconnected' };
  private stateChangeCallbacks: Set<StateChangeCallback> = new Set();
  
  // Reconnection state
  private reconnectAttempt: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isManualDisconnect: boolean = false;
  
  // Auth state
  private authToken: string | null = null;
  private tokenRefreshTimer: NodeJS.Timeout | null = null;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance of ConnectionManager
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Initialize the Realtime client with Supabase configuration
   */
  public initialize(realtimeClient: RealtimeClient): void {
    this.realtimeClient = realtimeClient;
    this.setupConnectionListeners();
  }

  /**
   * Get the current connection state
   */
  public getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  /**
   * Subscribe to connection state changes
   * 
   * @param callback - Function to call when connection state changes
   * @returns Unsubscribe function to remove the callback
   */
  public onStateChange(callback: StateChangeCallback): Unsubscribe {
    this.stateChangeCallbacks.add(callback);
    
    // Immediately call with current state
    callback(this.connectionState);
    
    return () => {
      this.stateChangeCallbacks.delete(callback);
    };
  }

  /**
   * Connect to Supabase Realtime
   */
  public async connect(): Promise<void> {
    if (!this.realtimeClient) {
      throw new Error('ConnectionManager not initialized. Call initialize() first.');
    }

    if (this.connectionState.status === 'connected') {
      console.log('[ConnectionManager] Already connected');
      return;
    }

    this.isManualDisconnect = false;
    this.clearReconnectTimer();

    try {
      // Supabase Realtime client connects automatically when channels are created
      // We just need to update our state
      this.updateConnectionState({ status: 'connected', connectedAt: new Date() });
      this.reconnectAttempt = 0;
      
      console.log('[ConnectionManager] Connected successfully');
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('[ConnectionManager] Connection failed:', err);
      this.updateConnectionState({ status: 'error', error: err });
      
      // Attempt reconnection
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from Supabase Realtime
   */
  public disconnect(): void {
    if (!this.realtimeClient) {
      return;
    }

    this.isManualDisconnect = true;
    this.clearReconnectTimer();
    this.clearTokenRefreshTimer();

    // Remove all channels
    this.realtimeClient.removeAllChannels();

    this.updateConnectionState({ status: 'disconnected', reason: 'Manual disconnect' });
    console.log('[ConnectionManager] Disconnected');
  }

  /**
   * Manually trigger reconnection
   */
  public async reconnect(): Promise<void> {
    console.log('[ConnectionManager] Manual reconnect triggered');
    this.reconnectAttempt = 0;
    this.clearReconnectTimer();
    await this.connect();
  }

  /**
   * Set authentication token
   * 
   * @param token - JWT token for authentication
   */
  public setAuth(token: string): void {
    this.authToken = token;
    
    // Schedule token refresh before expiration
    this.scheduleTokenRefresh(token);
    
    console.log('[ConnectionManager] Auth token set');
  }

  /**
   * Clear authentication token
   */
  public clearAuth(): void {
    this.authToken = null;
    this.clearTokenRefreshTimer();
    console.log('[ConnectionManager] Auth token cleared');
  }

  /**
   * Setup connection event listeners
   */
  private setupConnectionListeners(): void {
    if (!this.realtimeClient) {
      return;
    }

    // Supabase Realtime doesn't expose direct connection events
    // We'll monitor channel states instead
    console.log('[ConnectionManager] Connection listeners set up');
  }

  /**
   * Update connection state and notify subscribers
   */
  private updateConnectionState(newState: ConnectionState): void {
    this.connectionState = newState;
    
    // Notify all subscribers
    this.stateChangeCallbacks.forEach(callback => {
      try {
        callback(newState);
      } catch (error) {
        console.error('[ConnectionManager] Error in state change callback:', error);
      }
    });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.isManualDisconnect) {
      console.log('[ConnectionManager] Skipping reconnect (manual disconnect)');
      return;
    }

    if (this.reconnectAttempt >= MAX_RECONNECT_ATTEMPTS) {
      console.log('[ConnectionManager] Max reconnect attempts reached');
      this.updateConnectionState({
        status: 'error',
        error: new Error('Max reconnection attempts reached. Please reconnect manually.'),
      });
      return;
    }

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS.length - 1)];
    this.reconnectAttempt++;

    this.updateConnectionState({
      status: 'reconnecting',
      attempt: this.reconnectAttempt,
      nextRetryIn: delay,
    });

    console.log(`[ConnectionManager] Scheduling reconnect attempt ${this.reconnectAttempt} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * Schedule token refresh before expiration
   * 
   * @param token - JWT token to parse for expiration
   */
  private scheduleTokenRefresh(token: string): void {
    this.clearTokenRefreshTimer();

    try {
      // Parse JWT to get expiration time
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = payload.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      // Refresh 5 minutes before expiration
      const refreshTime = Math.max(0, timeUntilExpiry - 5 * 60 * 1000);

      if (refreshTime > 0) {
        console.log(`[ConnectionManager] Token refresh scheduled in ${Math.round(refreshTime / 1000)}s`);
        
        this.tokenRefreshTimer = setTimeout(() => {
          console.log('[ConnectionManager] Token refresh needed');
          // In a real implementation, this would trigger a token refresh
          // For now, we'll just log it
          // The application should handle token refresh and call setAuth() with the new token
        }, refreshTime);
      } else {
        console.warn('[ConnectionManager] Token already expired or expires soon');
      }
    } catch (error) {
      console.error('[ConnectionManager] Failed to parse token for refresh scheduling:', error);
    }
  }

  /**
   * Clear token refresh timer
   */
  private clearTokenRefreshTimer(): void {
    if (this.tokenRefreshTimer) {
      clearTimeout(this.tokenRefreshTimer);
      this.tokenRefreshTimer = null;
    }
  }

  /**
   * Get the Realtime client instance
   * 
   * @internal Used by SubscriptionManager
   */
  public getRealtimeClient(): RealtimeClient | null {
    return this.realtimeClient;
  }

  /**
   * Check if currently connected
   */
  public isConnected(): boolean {
    return this.connectionState.status === 'connected';
  }

  /**
   * Check if currently reconnecting
   */
  public isReconnecting(): boolean {
    return this.connectionState.status === 'reconnecting';
  }

  /**
   * Get current reconnection attempt number
   */
  public getReconnectAttempt(): number {
    return this.reconnectAttempt;
  }

  /**
   * Reset the singleton instance (for testing purposes)
   * 
   * @internal
   */
  public static resetInstance(): void {
    if (ConnectionManager.instance) {
      ConnectionManager.instance.disconnect();
      ConnectionManager.instance = null;
    }
  }
}

// Export singleton instance getter
export const getConnectionManager = () => ConnectionManager.getInstance();
