"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface MessageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messageId: string;
  currentContent: string;
  onSave: (messageId: string, newContent: string) => Promise<void>;
}

export function MessageEditDialog({
  open,
  onOpenChange,
  messageId,
  currentContent,
  onSave,
}: MessageEditDialogProps) {
  const [content, setContent] = useState(currentContent);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setContent(currentContent);
  }, [currentContent, open]);

  const handleSave = async () => {
    if (!content.trim() || content === currentContent) {
      onOpenChange(false);
      return;
    }

    setSaving(true);
    try {
      await onSave(messageId, content.trim());
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save message", error);
    } finally {
      setSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Message</DialogTitle>
          <DialogDescription>
            Make changes to your message. Press Cmd/Ctrl + Enter to save.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="min-h-[100px] resize-none"
            maxLength={5000}
            autoFocus
          />
          <p className="text-xs text-muted-foreground mt-2">
            {content.length}/5000 characters
          </p>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={!content.trim() || content === currentContent || saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
