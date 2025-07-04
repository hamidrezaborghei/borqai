// app/dev/page.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useStreamingOptimization } from "@/hooks/use-streaming-optimization";
import { useChat } from "@ai-sdk/react";
import { Safari } from "@/components/magicui/safari";
import Iphone15Pro from "@/components/magicui/iphone-15-pro";
import { MessageInput } from "@/components/ui/message-input";
import { AnimatedList } from "@/components/magicui/animated-list";
import {
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Terminal,
  Brain,
  Smartphone,
  Laptop,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UIMessage } from "ai";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// --- Types ---
type WebsiteResult = {
  html: string;
};

interface ProgressItem {
  id: string;
  type: "thinking" | "tool-call" | "tool-result" | "step";
  content: string;
  toolName?: string;
  status?: "active" | "completed" | "cancelled";
  timestamp: Date;
  promptIndex?: number;
}

interface PromptGroup {
  promptIndex: number;
  userMessage: string;
  items: ProgressItem[];
  isActive: boolean;
  timestamp: Date;
}

// --- Constants ---
const ICON_CONFIG = {
  thinking: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: Brain, className: "h-4 w-4 text-green-500" },
    default: { icon: Brain, className: "h-4 w-4 text-green-500" },
  },
  "tool-call": {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: Terminal, className: "h-4 w-4 text-green-500" },
    default: { icon: Terminal, className: "h-4 w-4 text-green-500" },
  },
  "tool-result": {
    completed: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
    default: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
  },
  step: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
    default: { icon: CheckCircle, className: "h-4 w-4 text-gray-500" },
  },
} as const;

const STATUS_STYLES = {
  active: {
    text: "text-orange-500",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
  },
  completed: {
    text: "text-green-500",
    bg: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  },
  cancelled: {
    text: "text-red-500",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  },
  default: {
    text: "text-gray-500",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  },
} as const;

// --- Utility Functions ---
const getIconConfig = (item: ProgressItem) => {
  const type = item.type;
  const status = item.status || "default";

  if (type in ICON_CONFIG) {
    const typeConfig = ICON_CONFIG[type as keyof typeof ICON_CONFIG];
    const statusConfig = typeConfig[status as keyof typeof typeConfig];
    if (statusConfig) {
      return statusConfig;
    }
    // Fallback to default, then completed
    return typeConfig.default || typeConfig.completed;
  }

  return ICON_CONFIG.step.default;
};

const getStatusStyles = (status: string) => {
  return (
    STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.default
  );
};

// --- Memoized Components ---
const ProgressItemComponent = React.memo(function ProgressItemComponent({
  item,
}: {
  item: ProgressItem;
}) {
  const iconConfig = useMemo(
    () => getIconConfig(item),
    [item.type, item.status]
  );
  const styles = useMemo(
    () => getStatusStyles(item.status || "default"),
    [item.status]
  );

  const IconComponent = iconConfig.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
        styles.bg
      )}
    >
      <IconComponent className={iconConfig.className} />
      <span className={cn("flex-1", styles.text)}>{item.content}</span>
    </div>
  );
});

const PromptAccordion = React.memo(function PromptAccordion({
  group,
  isDefaultOpen = false,
  keyPrefix = "",
}: {
  group: PromptGroup;
  isDefaultOpen?: boolean;
  keyPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  const handleToggle = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted/70 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {group.promptIndex + 1}
          </span>
          <span className="truncate max-w-[200px]">{group.userMessage}</span>
          {group.isActive && (
            <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="pl-4">
          <AnimatedList delay={300} className="space-y-2">
            {group.items.map((item) => (
              <ProgressItemComponent
                key={`${keyPrefix}${item.id}`}
                item={item}
              />
            ))}
          </AnimatedList>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

const MobileProgressHeader = React.memo(function MobileProgressHeader({
  latestProgressItem,
  isProgressOpen,
  onToggle,
}: {
  latestProgressItem: ProgressItem | null;
  isProgressOpen: boolean;
  onToggle: () => void;
}) {
  const renderProgressIcon = useCallback((item: ProgressItem) => {
    const iconConfig = getIconConfig(item);
    const IconComponent = iconConfig.icon;
    return (
      <IconComponent
        className={iconConfig.className.replace("h-4 w-4", "h-3 w-3")}
      />
    );
  }, []);

  return (
    <div className="lg:hidden flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Menu className="h-4 w-4 flex-shrink-0" />
          {latestProgressItem && !isProgressOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {renderProgressIcon(latestProgressItem)}
              <span className="truncate text-xs">
                {latestProgressItem.content}
              </span>
            </div>
          ) : (
            <span className="font-semibold">Progress</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>
    </div>
  );
});

const DeviceToggle = React.memo(function DeviceToggle({
  mockup,
  onMockupChange,
}: {
  mockup: "safari" | "iphone";
  onMockupChange: (mockup: "safari" | "iphone") => void;
}) {
  const handleSafariClick = useCallback(() => {
    onMockupChange("safari");
  }, [onMockupChange]);

  const handleIphoneClick = useCallback(() => {
    onMockupChange("iphone");
  }, [onMockupChange]);

  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded-lg w-fit mx-auto flex-shrink-0">
      <button
        onClick={handleSafariClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          mockup === "safari"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        )}
      >
        <Laptop className="h-4 w-4" />
        <span className="hidden sm:inline">Desktop</span>
      </button>
      <button
        onClick={handleIphoneClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          mockup === "iphone"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        )}
      >
        <Smartphone className="h-4 w-4" />
        <span className="hidden sm:inline">Mobile</span>
      </button>
    </div>
  );
});

// --- Custom Hooks ---
function useProgressGroups(
  messages: UIMessage[],
  status: string
): PromptGroup[] {
  return useMemo(() => {
    if (!messages.length) return [];

    const groups: PromptGroup[] = [];
    const promptGroups: {
      userMsg: UIMessage;
      assistantMsgs: UIMessage[];
      promptIndex: number;
    }[] = [];

    let currentPromptIndex = 0;

    // Group messages by user prompts - optimized loop
    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.role === "user" && msg.parts?.length) {
        const assistantMsgs: UIMessage[] = [];

        // Collect following assistant messages
        for (let j = i + 1; j < messages.length; j++) {
          const nextMsg = messages[j];
          if (nextMsg.role === "assistant") {
            assistantMsgs.push(nextMsg);
          } else if (nextMsg.role === "user") {
            break;
          }
        }

        promptGroups.push({
          userMsg: msg,
          assistantMsgs,
          promptIndex: currentPromptIndex++,
        });
      }
    }

    // Process each prompt group with optimizations
    for (let groupIdx = 0; groupIdx < promptGroups.length; groupIdx++) {
      const group = promptGroups[groupIdx];
      const isLastGroup = groupIdx === promptGroups.length - 1;
      const isActiveGroup = isLastGroup && status === "streaming";

      const items: ProgressItem[] = [];
      const userContent =
        group.userMsg.parts?.find((part) => part.type === "text")?.text ||
        "New request";

      // Add initializing step
      const hasAssistantResponse = group.assistantMsgs.length > 0;
      items.push({
        id: `init-${group.promptIndex}`,
        type: "step",
        content: "Initializing",
        status: hasAssistantResponse || !isActiveGroup ? "completed" : "active",
        timestamp: group.userMsg.createdAt || new Date(),
        promptIndex: group.promptIndex,
      });

      // Process assistant messages with reduced complexity
      let thinkingCounter = 0;
      let toolCallCounter = 0;
      let toolResultCounter = 0;
      const processedToolCalls = new Set<string>();

      // Only process the last few messages to reduce computation
      const messagesToProcess = isActiveGroup
        ? group.assistantMsgs
        : group.assistantMsgs.slice(-3); // Limit processing for completed groups

      for (const assistantMsg of messagesToProcess) {
        if (!assistantMsg.parts) continue;

        for (const part of assistantMsg.parts) {
          // Handle reasoning/thinking
          if (part.type === "reasoning") {
            const isLastReasoning =
              isActiveGroup &&
              assistantMsg ===
                group.assistantMsgs[group.assistantMsgs.length - 1] &&
              part === assistantMsg.parts[assistantMsg.parts.length - 1];

            items.push({
              id: `thinking-${group.promptIndex}-${thinkingCounter}`,
              type: "thinking",
              content:
                part.reasoning.length > 100
                  ? `${part.reasoning.substring(0, 100)}...`
                  : part.reasoning, // Truncate long reasoning
              status:
                isLastReasoning && status === "streaming"
                  ? "active"
                  : "completed",
              timestamp: assistantMsg.createdAt || new Date(),
              promptIndex: group.promptIndex,
            });
            thinkingCounter++;
          }

          // Handle tool invocations with optimizations
          if (part.type === "tool-invocation" && part.toolInvocation) {
            const toolName =
              part.toolInvocation.toolName || `tool-${toolCallCounter}`;

            if (
              part.toolInvocation.state === "call" ||
              part.toolInvocation.state === "partial-call"
            ) {
              const toolCallId = `toolcall-${toolName}-${group.promptIndex}-${toolCallCounter}`;

              if (!processedToolCalls.has(toolCallId)) {
                const isLastToolCall =
                  isActiveGroup &&
                  assistantMsg ===
                    group.assistantMsgs[group.assistantMsgs.length - 1];

                items.push({
                  id: toolCallId,
                  type: "tool-call",
                  content: `Calling ${toolName}...`,
                  toolName: toolName,
                  status:
                    isLastToolCall && status === "streaming"
                      ? "active"
                      : "completed",
                  timestamp: assistantMsg.createdAt || new Date(),
                  promptIndex: group.promptIndex,
                });
                processedToolCalls.add(toolCallId);
                toolCallCounter++;
              }
            }

            if (part.toolInvocation.state === "result") {
              // Find the corresponding tool call to update
              const toolCallId = `toolcall-${toolName}-${group.promptIndex}-${
                toolCallCounter - 1
              }`;
              const toolCallIdx = items.findIndex(
                (item) => item.id === toolCallId && item.type === "tool-call"
              );

              if (toolCallIdx !== -1) {
                items[toolCallIdx] = {
                  ...items[toolCallIdx],
                  status: "completed",
                  content: `Called ${toolName}`,
                };
              }

              // Add tool result with unique ID
              const resultId = `toolresult-${toolName}-${group.promptIndex}-${toolResultCounter}`;
              items.push({
                id: resultId,
                type: "tool-result",
                content: `Result from ${toolName}`,
                toolName: toolName,
                status: "completed",
                timestamp: assistantMsg.createdAt || new Date(),
                promptIndex: group.promptIndex,
              });
              toolResultCounter++;
            }
          }
        }
      }

      // Add website creation step
      const hasTextResponse = group.assistantMsgs.some((msg) =>
        msg.parts?.some((part) => part.type === "text" && part.text)
      );

      if (hasTextResponse) {
        const isCreating = isActiveGroup && status === "streaming";
        items.push({
          id: `creating-website-${group.promptIndex}`,
          type: "step",
          content: isCreating ? "Creating website..." : "Website created!",
          status: isCreating ? "active" : "completed",
          timestamp:
            group.assistantMsgs[group.assistantMsgs.length - 1]?.createdAt ||
            new Date(),
          promptIndex: group.promptIndex,
        });
      }

      groups.push({
        promptIndex: group.promptIndex,
        userMessage: userContent,
        items,
        isActive: isActiveGroup,
        timestamp: group.userMsg.createdAt || new Date(),
      });
    }

    return groups;
  }, [messages, status]);
}

function useWebsiteResult(messages: UIMessage[]): WebsiteResult | null {
  const filteredMessages = useMemo(
    () =>
      messages.filter((msg) => msg.role === "user" || msg.role === "assistant"),
    [messages]
  );

  return useMemo(() => {
    for (let i = filteredMessages.length - 1; i >= 0; i--) {
      const msg = filteredMessages[i];
      if (!msg.parts) continue;

      for (let j = msg.parts.length - 1; j >= 0; j--) {
        const part = msg.parts[j];
        if (part.type === "text" && part.text) {
          try {
            const parsed = JSON.parse(part.text);
            if (parsed && typeof parsed === "object" && "html" in parsed) {
              return { html: parsed.html || "" };
            }
          } catch {
            // Not valid JSON, continue
          }
        }
      }
    }
    return null;
  }, [filteredMessages]);
}

function useLatestProgressItem(
  progressGroups: PromptGroup[],
  isProgressOpen: boolean
) {
  return useMemo(() => {
    if (isProgressOpen || !progressGroups.length) return null;

    const latestGroup = progressGroups[progressGroups.length - 1];
    if (!latestGroup) return null;

    // Find active item or return last item
    const activeItem = latestGroup.items.find(
      (item) => item.status === "active"
    );
    return (
      activeItem || latestGroup.items[latestGroup.items.length - 1] || null
    );
  }, [progressGroups, isProgressOpen]);
}

// --- Main Component ---
export default function DevPage() {
  const [mockup, setMockup] = useState<"safari" | "iphone">("safari");
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Initialize streaming optimization with longer timeout for dev
  const streamingOptimization = useStreamingOptimization({
    maxRetries: 2, // Fewer retries for dev due to complexity
    retryDelay: 2000,
    timeoutMs: 120000, // 2 minutes for dev requests
  });

  const {
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
    messages,
    error,
  } = useChat({
    api: "/api/dev",
    streamProtocol: "data",
    onError: (error) => {
      console.error("Dev chat error:", error);
    },
    onFinish: () => {
      streamingOptimization.reset();
    },
  });

  // Call hooks at the top level, then memoize with performance monitoring
  const rawProgressGroups = useProgressGroups(messages, status);
  const rawResult = useWebsiteResult(messages);

  // Memoize with performance monitoring
  const progressGroups = useMemo(() => {
    const groups = rawProgressGroups;
    return groups;
  }, [rawProgressGroups]);

  const result = useMemo(() => {
    const websiteResult = rawResult;
    return websiteResult;
  }, [rawResult]);

  const latestProgressItem = useLatestProgressItem(
    progressGroups,
    isProgressOpen
  );

  // Enhanced submit handler with streaming optimization
  const handleSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      const abortController = streamingOptimization.createAbortController();

      const cleanup = streamingOptimization.setRequestTimeout(() => {
        console.warn("Dev request timed out after 120 seconds");
      });

      // Add cleanup to abort signal
      abortController.signal.addEventListener("abort", cleanup);

      originalHandleSubmit(event);
    },
    [originalHandleSubmit, streamingOptimization]
  );

  // Enhanced stop function with throttling
  const handleStop = useCallback(() => {
    streamingOptimization.abort();
    stop();
  }, [streamingOptimization, stop]);

  // Debounced progress toggle to prevent rapid state changes
  const handleProgressToggle = useCallback(() => {
    setIsProgressOpen((prev) => !prev);
  }, []);

  const handleProgressClose = useCallback(() => {
    setIsProgressOpen(false);
  }, []);

  const handleMockupChange = useCallback((newMockup: "safari" | "iphone") => {
    setMockup(newMockup);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingOptimization.abort();
    };
  }, [streamingOptimization]);

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row gap-4 lg:gap-8 px-4 pt-4 pb-4">
      {/* Mobile Progress Header */}
      <MobileProgressHeader
        latestProgressItem={latestProgressItem}
        isProgressOpen={isProgressOpen}
        onToggle={handleProgressToggle}
      />

      {/* Mobile Progress Drawer */}
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
            isProgressOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={handleProgressClose}
        />

        {/* Drawer */}
        <div
          className={cn(
            "lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r z-50 flex flex-col transition-transform duration-300 ease-in-out",
            isProgressOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <span className="text-lg font-semibold">Progress</span>
            <button
              onClick={handleProgressClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {progressGroups.map((group, index) => (
                <PromptAccordion
                  key={`mobile-prompt-${group.promptIndex}`}
                  group={group}
                  keyPrefix="mobile-"
                  isDefaultOpen={index === progressGroups.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </>

      {/* Desktop Progress Sidebar */}
      <div className="hidden lg:flex lg:w-1/4 flex-col gap-4 min-h-0">
        <span className="text-lg font-semibold flex-shrink-0">Progress</span>
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {progressGroups.map((group, index) => (
            <PromptAccordion
              key={`desktop-prompt-${group.promptIndex}`}
              group={group}
              keyPrefix="desktop-"
              isDefaultOpen={index === progressGroups.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:flex-3/4 flex flex-col gap-4 min-h-0">
        {/* Device Toggle */}
        <DeviceToggle mockup={mockup} onMockupChange={handleMockupChange} />

        {/* Mockup Display */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="h-full flex items-center justify-center p-4">
            {mockup === "safari" ? (
              <div className="w-full max-w-5xl h-full max-h-full">
                <Safari htmlContent={result?.html || ""} url="localhost:3000" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Iphone15Pro htmlContent={result?.html || ""} />
              </div>
            )}
          </div>
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
          <form onSubmit={handleSubmit} autoComplete="off">
            <MessageInput
              value={input}
              onChange={handleInputChange}
              isGenerating={status === "streaming"}
              stop={handleStop}
              placeholder="Describe the website you want to create..."
            />
          </form>
          {error && (
            <div className="mt-2 text-red-500 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <strong>Error:</strong> {error.message}
              {error.message.includes("timeout") && (
                <div className="mt-2 text-sm">
                  The request took too long to complete. Please try again with a
                  shorter description.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
