"use client";

interface NewMessagesIndicatorProps {
  count: number;
  show: boolean;
}

export function NewMessagesIndicator({ count, show }: NewMessagesIndicatorProps) {
  if (!show || count === 0) return null;

  return (
    <div className="sticky top-0 z-10 flex items-center justify-center py-2 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="px-4 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-medium shadow-lg">
        {count} new {count === 1 ? "message" : "messages"}
      </div>
    </div>
  );
}
