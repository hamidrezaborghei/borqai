"use client";

import React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Ban, Brain, Loader2, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/features/chat/file-preview";
import { MarkdownRenderer } from "@/components/features/chat/markdown-renderer";
import { getToolName, isToolUIPart, UIMessage } from "ai";

// RTL detection for text direction
function isRTLText(text: string): boolean {
  const rtlRegex =
    /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return false;
  return rtlRegex.test(trimmedText.substring(0, 10));
}

const chatBubbleVariants = cva(
  "group/message relative break-words rounded-lg p-3 text-sm sm:max-w-[70%]",
  {
    variants: {
      isUser: {
        true: "bg-primary text-primary-foreground",
        false: "bg-muted text-foreground",
      },
      animation: {
        none: "",
        slide: "duration-300 animate-in fade-in-0",
        scale: "duration-300 animate-in fade-in-0 zoom-in-75",
        fade: "duration-500 animate-in fade-in-0",
      },
    },
    compoundVariants: [
      {
        isUser: true,
        animation: "slide",
        class: "slide-in-from-right",
      },
      {
        isUser: false,
        animation: "slide",
        class: "slide-in-from-left",
      },
      {
        isUser: true,
        animation: "scale",
        class: "origin-bottom-right",
      },
      {
        isUser: false,
        animation: "scale",
        class: "origin-bottom-left",
      },
    ],
  }
);

type Animation = VariantProps<typeof chatBubbleVariants>["animation"];

export interface ChatMessageProps extends UIMessage {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  parts,
  showTimeStamp = false,
  animation = "scale",
  actions,
}) => {
  const isUser = role === "user";
  const textContent =
    parts
      ?.filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n\n") || "";
  const isRTL = isRTLText(textContent);

  // File parts for user messages
  const fileParts = parts?.filter((part) => part.type === "file") || [];
  const files =
    fileParts.length > 0
      ? fileParts
          .map((filePart) => {
            if (filePart.type === "file" && filePart.url) {
              const dataArray = dataUrlToUint8Array(filePart.url);
              return new File([dataArray], "file", {
                type: filePart.mediaType,
              });
            }
            return null;
          })
          .filter(Boolean)
      : [];

  // Tool and reasoning parts for assistant
  const toolParts = parts?.filter((part) => isToolUIPart(part)) || [];
  const reasoningParts =
    parts?.filter((part) => part.type === "reasoning") || [];

  const formattedTime = new Date()?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // --- User Message Bubble ---
  if (isUser) {
    return (
      <div className={cn("flex flex-col", "items-end")}>
        {files.length > 0 && (
          <div className="mb-1 flex flex-wrap gap-2">
            {files.map((file, index) =>
              file ? <FilePreview file={file} key={index} /> : null
            )}
          </div>
        )}
        <div
          className={cn(chatBubbleVariants({ isUser, animation }))}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MarkdownRenderer>{textContent}</MarkdownRenderer>
        </div>
        {showTimeStamp && (
          <time
            dateTime={new Date().toISOString()}
            className={cn(
              "mt-1 block px-1 text-xs opacity-50",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        )}
      </div>
    );
  }

  // --- Assistant Message Bubble ---
  if (parts && parts.length > 0) {
    // Show active tool call if present
    const activeTool = toolParts.find(
      (part) =>
        isToolUIPart(part) &&
        (part.state === "input-streaming" || part.state === "input-available")
    );
    if (activeTool) {
      const toolName = getToolName(activeTool);
      return (
        <div className="flex flex-col items-start">
          <ToolCall toolName={toolName} state={activeTool.state} />
        </div>
      );
    }

    // Show reasoning if present and no text
    if (reasoningParts.length > 0 && !textContent) {
      return (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Brain className="h-4 w-4" />
            <span>Thinking...</span>
            <Loader2 className="h-3 w-3 animate-spin" />
          </div>
        </div>
      );
    }

    // Show final text content if available
    if (textContent) {
      return (
        <div className="flex flex-col items-start">
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(chatBubbleVariants({ isUser, animation }))}
          >
            <MarkdownRenderer>{textContent}</MarkdownRenderer>
            {actions && (
              <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                {actions}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Fallback for empty or unknown parts
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>Processing...</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      </div>
    );
  }

  // Fallback for messages without parts
  return (
    <div className="flex flex-col items-start">
      <div
        className={cn(chatBubbleVariants({ isUser, animation }))}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <MarkdownRenderer>No content available</MarkdownRenderer>
        {actions && (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        )}
      </div>
      {showTimeStamp && (
        <time
          dateTime={new Date().toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      )}
    </div>
  );
};

// --- Utility: Convert data URL to Uint8Array for file previews ---
function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf);
}

// --- Tool Call UI ---
function ToolCall({ toolName, state }: { toolName: string; state: string }) {
  if (state === "input-streaming" || state === "input-available") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Terminal className="h-4 w-4" />
          <span>
            Calling <span className="font-mono">`{toolName}`</span>...
          </span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      </div>
    );
  }
  if (state === "output-error") {
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Ban className="h-4 w-4" />
          <span>
            Error in <span className="font-mono">`{toolName}`</span>
          </span>
        </div>
      </div>
    );
  }
  return null;
}
