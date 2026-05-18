"use client";

interface TypingIndicatorProps {
  userName?: string;
  show: boolean;
}

export function TypingIndicator({ userName, show }: TypingIndicatorProps) {
  if (!show) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-center gap-2 px-3 py-2 rounded-2xl rounded-bl-md bg-muted max-w-[75%]">
        <span className="text-xs text-muted-foreground">
          {userName || "User"} is typing
        </span>
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
