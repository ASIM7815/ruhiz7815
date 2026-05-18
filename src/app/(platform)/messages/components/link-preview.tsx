"use client";

import { ExternalLink } from "lucide-react";

interface LinkPreviewProps {
  url: string;
  title?: string;
  description?: string;
  image?: string;
}

export function LinkPreview({ url, title, description, image }: LinkPreviewProps) {
  const domain = new URL(url).hostname.replace("www.", "");

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="block mt-2 rounded-lg border border-border overflow-hidden hover:bg-accent/50 transition-colors"
    >
      {image && (
        <div className="w-full h-32 bg-muted overflow-hidden">
          <img
            src={image}
            alt={title || "Link preview"}
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-3">
        {title && (
          <p className="font-medium text-sm line-clamp-1 mb-1">{title}</p>
        )}
        {description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <ExternalLink className="h-3 w-3" />
          <span className="truncate">{domain}</span>
        </div>
      </div>
    </a>
  );
}
