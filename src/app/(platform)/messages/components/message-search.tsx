"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface MessageSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
  resultCount?: number;
}

export function MessageSearch({ onSearch, onClose, resultCount = 0 }: MessageSearchProps) {
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search messages..."
          className="pl-9 pr-4"
          autoFocus
        />
      </div>
      {query && (
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {resultCount} {resultCount === 1 ? "result" : "results"}
        </span>
      )}
      <Button variant="ghost" size="icon" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
