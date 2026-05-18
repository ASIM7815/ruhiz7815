export function MessageSkeleton() {
  return (
    <div className="space-y-4 p-4 animate-pulse">
      {/* Message 1 - Other user */}
      <div className="flex items-end gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-16 w-64 rounded-2xl rounded-bl-md bg-muted" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>

      {/* Message 2 - Own message */}
      <div className="flex items-end gap-2 justify-end">
        <div className="space-y-2 flex flex-col items-end">
          <div className="h-12 w-48 rounded-2xl rounded-br-md bg-muted" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>

      {/* Message 3 - Other user */}
      <div className="flex items-end gap-2">
        <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0" />
        <div className="space-y-2">
          <div className="h-20 w-72 rounded-2xl rounded-bl-md bg-muted" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>

      {/* Message 4 - Own message */}
      <div className="flex items-end gap-2 justify-end">
        <div className="space-y-2 flex flex-col items-end">
          <div className="h-14 w-56 rounded-2xl rounded-br-md bg-muted" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

export function ConversationListSkeleton() {
  return (
    <div className="divide-y divide-border animate-pulse">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          <div className="h-12 w-12 rounded-full bg-muted flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 bg-muted rounded" />
              <div className="h-3 w-8 bg-muted rounded" />
            </div>
            <div className="h-3 w-48 bg-muted rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
