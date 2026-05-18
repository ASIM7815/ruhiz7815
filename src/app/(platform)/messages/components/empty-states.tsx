import { MessageSquare, Search, Users, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="rounded-full bg-muted p-6 mb-4">
        {icon || <Inbox className="h-12 w-12 text-muted-foreground/50" />}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-sm mb-4">{description}</p>
      {action && (
        <Button onClick={action.onClick} variant="outline">
          {action.label}
        </Button>
      )}
    </div>
  );
}

export function NoConversationsEmpty({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      icon={<MessageSquare className="h-12 w-12 text-muted-foreground/50" />}
      title="No conversations yet"
      description="Search for a student using their 5-digit UID to start messaging"
      action={onSearch ? { label: "Search Users", onClick: onSearch } : undefined}
    />
  );
}

export function NoGroupsEmpty() {
  return (
    <EmptyState
      icon={<Users className="h-12 w-12 text-muted-foreground/50" />}
      title="No group chats yet"
      description="Join a project, study group, or startup to get group chats"
    />
  );
}

export function NoSearchResultsEmpty({ query }: { query: string }) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12 text-muted-foreground/50" />}
      title="No results found"
      description={`No messages found for "${query}". Try a different search term.`}
    />
  );
}

export function NoMessagesEmpty() {
  return (
    <EmptyState
      icon={<MessageSquare className="h-12 w-12 text-muted-foreground/50" />}
      title="No messages yet"
      description="Start the conversation by sending a message below"
    />
  );
}
