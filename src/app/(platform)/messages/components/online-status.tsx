interface OnlineStatusProps {
  isOnline: boolean;
  className?: string;
}

export function OnlineStatus({ isOnline, className = "" }: OnlineStatusProps) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full border-2 border-background transition-colors ${
        isOnline ? "bg-green-500" : "bg-gray-400"
      } ${className}`}
      title={isOnline ? "Online" : "Offline"}
    />
  );
}
