"use client";

import { Loader2, ArrowDown } from "lucide-react";

interface PullToRefreshIndicatorProps {
  isPulling: boolean;
  isRefreshing: boolean;
  pullProgress: number;
}

export function PullToRefreshIndicator({
  isPulling,
  isRefreshing,
  pullProgress,
}: PullToRefreshIndicatorProps) {
  if (!isPulling && !isRefreshing) return null;

  return (
    <div className="absolute top-0 left-0 right-0 flex items-center justify-center py-4 z-10">
      <div
        className="flex items-center justify-center transition-opacity"
        style={{ opacity: Math.min(pullProgress, 1) }}
      >
        {isRefreshing ? (
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        ) : (
          <ArrowDown
            className="h-5 w-5 text-primary transition-transform"
            style={{
              transform: `rotate(${pullProgress >= 1 ? 180 : 0}deg)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
