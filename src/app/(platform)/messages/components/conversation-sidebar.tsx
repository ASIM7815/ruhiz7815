"use client";

import { useState } from "react";
import { Search, Loader2, MessageSquarePlus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
      {/* Header */}
      <div className="p-4 border-b border-border space-y-3 flex-shrink-0">
        <h2 className="text-lg font-semibold">Messages</h2>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-muted rounded-lg">
          <button
            onClick={() => onTabChange("chats")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              activeTab === "chats"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Chats
          </button>
          <button
            onClick={() => onTabChange("groups")}
            className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
              activeTab === "groups"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="h-3 w-3" />
            Groups
          </button>
        </div>

        {/* Search */}
        {activeTab === "chats" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by 5-digit UID..."
              value={searchQuery}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9"
              maxLength={5}
            />
          </div>
        )}
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : activeTab === "chats" ? (
          conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <MessageSquarePlus className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No conversations yet</p>
              <p className="text-xs text-muted-foreground mt-1">
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
          // Groups List
          groupConversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No group chats yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Join a project, study group, or startup to get group chats
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {groupConversations.map((group) => (
                <button
                  key={group.id}
                  onClick={() => onSelectGroup(group.id)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-accent/50 transition-colors text-left ${
                    selectedGroupId === group.id ? "bg-accent" : ""
                  }`}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium truncate">{group.name}</p>
                      {group.last_message_at && (
                        <span className="text-[10px] text-muted-foreground ml-2 flex-shrink-0">
                          {formatTime(group.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
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
