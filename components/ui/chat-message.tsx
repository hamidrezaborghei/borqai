"use client";

import React, { useMemo } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Ban, Brain, Loader2, Terminal } from "lucide-react";

import { cn } from "@/lib/utils";
import { FilePreview } from "@/components/ui/file-preview";
import { MarkdownRenderer } from "@/components/ui/markdown-renderer";

// Function to detect RTL text
function isRTLText(text: string): boolean {
  // RTL Unicode ranges for Arabic, Hebrew, Persian, Urdu, etc.
  const rtlRegex =
    /[\u0590-\u05FF\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

  // Check if the text starts with RTL characters
  const trimmedText = text.trim();
  if (trimmedText.length === 0) return false;

  // Check the first few characters to determine direction
  const firstChars = trimmedText.substring(0, 10);
  return rtlRegex.test(firstChars);
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

interface Attachment {
  name?: string;
  contentType?: string;
  url: string;
}

interface PartialToolCall {
  state: "partial-call";
  toolName: string;
}

interface ToolCall {
  state: "call";
  toolName: string;
}

interface ToolResult {
  state: "result";
  toolName: string;
  result: {
    __cancelled?: boolean;
    [key: string]: unknown;
  };
}

type ToolInvocation = PartialToolCall | ToolCall | ToolResult;

interface ReasoningPart {
  type: "reasoning";
  reasoning: string;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocation: ToolInvocation;
}

interface TextPart {
  type: "text";
  text: string;
}

// For compatibility with AI SDK types, not used
interface SourcePart {
  type: "source";
  source?: unknown;
}

interface FilePart {
  type: "file";
  mimeType: string;
  data: string;
}

interface StepStartPart {
  type: "step-start";
}

type MessagePart =
  | TextPart
  | ReasoningPart
  | ToolInvocationPart
  | SourcePart
  | FilePart
  | StepStartPart;

export interface Message {
  id: string;
  role: "user" | "assistant" | (string & {});
  content: string;
  createdAt?: Date;
  experimental_attachments?: Attachment[];
  toolInvocations?: ToolInvocation[];
  parts?: MessagePart[];
}

export interface ChatMessageProps extends Message {
  showTimeStamp?: boolean;
  animation?: Animation;
  actions?: React.ReactNode;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  role,
  content,
  createdAt,
  showTimeStamp = false,
  animation = "scale",
  actions,
  experimental_attachments,
  toolInvocations,
  parts,
}) => {
  const isRTL = isRTLText(content);

  const files = useMemo(() => {
    return experimental_attachments?.map((attachment) => {
      const dataArray = dataUrlToUint8Array(attachment.url);
      const file = new File([dataArray], attachment.name ?? "Unknown", {
        type: attachment.contentType,
      });
      return file;
    });
  }, [experimental_attachments]);

  const isUser = role === "user";

  const formattedTime = createdAt?.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  if (isUser) {
    return (
      <div
        className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
      >
        {files ? (
          <div className="mb-1 flex flex-wrap gap-2">
            {files.map((file, index) => {
              return <FilePreview file={file} key={index} />;
            })}
          </div>
        ) : null}

        <div
          className={cn(chatBubbleVariants({ isUser, animation }))}
          dir={isRTL ? "rtl" : "ltr"}
        >
          <MarkdownRenderer>{content}</MarkdownRenderer>
        </div>

        {showTimeStamp && createdAt ? (
          <time
            dateTime={createdAt.toISOString()}
            className={cn(
              "mt-1 block px-1 text-xs opacity-50",
              animation !== "none" && "duration-500 animate-in fade-in-0"
            )}
          >
            {formattedTime}
          </time>
        ) : null}
      </div>
    );
  }

  if (parts && parts.length > 0) {
    // Separate different types of parts
    const textParts = parts.filter((part) => part.type === "text");
    // const reasoningParts = parts.filter((part) => part.type === "reasoning");
    const toolParts = parts.filter((part) => part.type === "tool-invocation");

    // Collect all tool invocations
    const allToolInvocations = toolParts.map((part) => part.toolInvocation);

    // Check if we have active tool calls
    const hasActiveCalls = allToolInvocations.some(
      (inv) => inv.state === "call" || inv.state === "partial-call"
    );

    // If there are active tool calls, show only the tool status
    if (hasActiveCalls) {
      return (
        <div
          className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
        >
          <ToolCall toolInvocations={allToolInvocations} />
        </div>
      );
    }

    // If tools are completed, show the final text content (if any)
    const finalTextContent = textParts.map((part) => part.text).join("\n\n");
    if (finalTextContent) {
      return (
        <div
          className={cn("flex flex-col", isUser ? "items-end" : "items-start")}
        >
          <div
            dir={isRTL ? "rtl" : "ltr"}
            className={cn(chatBubbleVariants({ isUser, animation }))}
          >
            <MarkdownRenderer>{finalTextContent}</MarkdownRenderer>
            {actions ? (
              <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
                {actions}
              </div>
            ) : null}
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-start gap-2">
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
          <Brain className="h-4 w-4" />
          <span>Thinking ...</span>
          <Loader2 className="h-3 w-3 animate-spin" />
        </div>
      </div>
    );
  }

  if (toolInvocations && toolInvocations.length > 0) {
    return <ToolCall toolInvocations={toolInvocations} />;
  }

  return (
    <div className={cn("flex flex-col", isUser ? "items-end" : "items-start")}>
      <div
        className={cn(chatBubbleVariants({ isUser, animation }))}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <MarkdownRenderer>{content}</MarkdownRenderer>
        {actions ? (
          <div className="absolute -bottom-4 right-2 flex space-x-1 rounded-lg border bg-background p-1 text-foreground opacity-0 transition-opacity group-hover/message:opacity-100">
            {actions}
          </div>
        ) : null}
      </div>

      {showTimeStamp && createdAt ? (
        <time
          dateTime={createdAt.toISOString()}
          className={cn(
            "mt-1 block px-1 text-xs opacity-50",
            animation !== "none" && "duration-500 animate-in fade-in-0"
          )}
        >
          {formattedTime}
        </time>
      ) : null}
    </div>
  );
};

function dataUrlToUint8Array(data: string) {
  const base64 = data.split(",")[1];
  const buf = Buffer.from(base64, "base64");
  return new Uint8Array(buf);
}

function ToolCall({
  toolInvocations,
}: Pick<ChatMessageProps, "toolInvocations">) {
  if (!toolInvocations?.length) return null;

  // Find the current state of tool execution
  const hasActiveCalls = toolInvocations.some(
    (inv) => inv.state === "call" || inv.state === "partial-call"
  );
  const hasCancelled = toolInvocations.some(
    (inv) => inv.state === "result" && inv.result.__cancelled === true
  );
  const hasResults = toolInvocations.some(
    (inv) => inv.state === "result" && !inv.result.__cancelled
  );

  // If there are active calls, show the latest tool being called
  if (hasActiveCalls) {
    const activeCall = toolInvocations.findLast(
      (inv) => inv.state === "call" || inv.state === "partial-call"
    );

    if (activeCall) {
      return (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Terminal className="h-4 w-4" />
            <span>
              Calling{" "}
              <span className="font-mono">
                {"`"}
                {activeCall.toolName}
                {"`"}
              </span>
              ...
            </span>
            <Loader2 className="h-3 w-3 animate-spin" />
          </div>
        </div>
      );
    }
  }

  // If there are cancelled calls, show cancellation message
  if (hasCancelled && !hasResults) {
    const cancelledCall = toolInvocations.find(
      (inv) => inv.state === "result" && inv.result.__cancelled === true
    );

    if (cancelledCall) {
      return (
        <div className="flex flex-col items-start gap-2">
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
            <Ban className="h-4 w-4" />
            <span>
              Cancelled{" "}
              <span className="font-mono">
                {"`"}
                {cancelledCall.toolName}
                {"`"}
              </span>
            </span>
          </div>
        </div>
      );
    }
  }

  // If all tools have completed successfully, don't show tool invocations
  // The final result will be shown in the text content
  return null;
}
