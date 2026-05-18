"use client";

import { Search, Loader2, MessageSquarePlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ConversationListItem } from "./conversation-list-item";

interface Participant {
  id: string;
  uid: string | null;
  name: string;
  image: string | null;
}

interface Conversation {
  id: string;
  participant: Participant | null;
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    isRead: boolean;
    createdAt: string;
  } | null;
  unreadCount: number;
  updatedAt: string;
}

interface GroupConversation {
  id: string;
  name: string;
  image_url: string | null;
  source_type: string | null;
  member_count: number;
  last_message: string | null;
  last_message_at: string | null;
}

interface ConversationSidebarProps {
  conversations: Conversation[];
  groupConversations: GroupConversation[];
  selectedConversationId: string | null;
  selectedGroupId: string | null;
  currentUserId: string;
  loading: boolean;
  activeTab: "chats" | "groups";
  onSelectConversation: (conversation: Conversation) => void;
  onSelectGroup: (groupId: string) => void;
  onTabChange: (tab: "chats" | "groups") => void;
  onSearch: (query: string) => void;
  searchQuery: string;
}

export function ConversationSidebar({
  conversations,
  groupConversations,
  selectedConversationId,
  selectedGroupId,
  currentUserId,
  loading,
  activeTab,
  onSelectConversation,
  onSelectGroup,
  onTabChange,
  onSearch,
  searchQuery,
}: ConversationSidebarProps) {
  return (
    <div className="flex flex-col h-full border-r border-border bg-background">
      {/* Header - Mobile optimized */}
      <div className="p-3 sm:p-4 border-b border-border space-y-2.5 sm:space-y-3 flex-shrink-0 safe-area-inset-top">
        <h2 className="text-base sm:text-lg font-semibold">Messages</h2>

        {/* Tabs - Touch-friendly */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => onTabChange("chats")}
            className={`flex-1 px-3 py-2 sm:py-1.5 rounded-md text-sm sm:text-xs font-medium transition-all touch-manipulation active:scale-98 ${
              activeTab === "chats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => onTabChange("groups")}
            className={`flex-1 px-3 py-2 sm:py-1.5 rounded-md text-sm sm:text-xs font-medium transition-all flex items-center justify-center gap-1.5 touch-manipulation active:scale-98 ${
              activeTab === "groups"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3.5 w-3.5 sm:h-3 sm:w-3" />
            <span>Groups</span>
          </button>
        </div>

        {/* Search - Mobile optimized */}
        {activeTab === "chats" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by 5-digit UID..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 h-10 text-base sm:text-sm touch-manipulation"
              maxLength={5}
              inputMode="numeric"
              style={{ fontSize: "16px" }} // Prevent iOS zoom
            />
          </div>
        )}
      </div>

      {/* Conversation List - Optimized scrolling */}
      <ScrollArea className="flex-1 overscroll-contain">
        {loading ? (
          <div className="flex items-center justify-center py-16 sm:py-12">
            <Loader2 className="h-6 w-6 sm:h-7 sm:w-7 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "chats" ? (
          conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-12 px-4 text-center">
              <MessageSquarePlus className="h-14 w-14 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px]">
                Search a student&apos;s UID to start messaging
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <ConversationListItem
                  key={conv.id}
                  conversation={conv}
                  isSelected={selectedConversationId === conv.id}
                  currentUserId={currentUserId}
                  onClick={() => onSelectConversation(conv)}
                />
              ))}
            </div>
          )
        ) : (
          // Groups List - Mobile optimized
          groupConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 sm:py-12 px-4 text-center">
              <Users className="h-14 w-14 sm:h-12 sm:w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No group chats yet</p>
              <p className="text-xs text-muted-foreground mt-1.5 max-w-[240px]">
                Join a project, study group, or startup to get group chats
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groupConversations.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full flex items-center gap-3 p-3 sm:p-3.5 hover:bg-accent/50 active:bg-accent/70 transition-colors text-left touch-manipulation ${
                    selectedGroupId === group.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="h-11 w-11 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{group.name}</p>
                      {group.last_message_at && (
                        <span className="text-[10px] text-muted-foreground flex-shrink-0">
                          {formatTime(group.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {group.last_message || `${group.member_count} members`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </ScrollArea>
    </div>
  );
}

function formatTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d`;
  return new Date(dateStr).toLocaleDateString();
}
