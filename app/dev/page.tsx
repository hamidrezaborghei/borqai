// app/dev/page.tsx
"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useStreamingOptimization } from "@/hooks/use-streaming-optimization";
import { useChat } from "@ai-sdk/react";
import { Safari } from "@/components/magicui/safari";
import Iphone15Pro from "@/components/magicui/iphone-15-pro";
import { MessageInput } from "@/components/features/chat/message-input";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { DefaultChatTransport } from "ai";
import { DeviceToggle } from "@/components/features/dev";
import MobileProgressHeader from "@/components/features/dev/mobile-progress-header";
import PromptAccordion from "@/components/features/dev/prompt-accordion";
import {
  useLatestProgressItem,
  useProgressGroups,
  useWebsiteResult,
} from "@/hooks/dev";

// --- Custom Hooks ---

// --- Main Component ---
export default function DevPage() {
  const [mockup, setMockup] = useState<"safari" | "iphone">("safari");
  const [isProgressOpen, setIsProgressOpen] = useState(false);
  const [input, setInput] = useState("");

  // Initialize streaming optimization with longer timeout for dev
  const streamingOptimization = useStreamingOptimization({
    maxRetries: 2, // Fewer retries for dev due to complexity
    retryDelay: 2000,
    timeoutMs: 120000, // 2 minutes for dev requests
  });

  const { sendMessage, status, stop, messages, error } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/dev",
    }),
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

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  // Enhanced submit handler with streaming optimization
  const handleSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      event?.preventDefault?.();

      if (!input.trim()) return;

      const abortController = streamingOptimization.createAbortController();

      const cleanup = streamingOptimization.setRequestTimeout(() => {
        console.warn("Dev request timed out after 120 seconds");
      });

      // Add cleanup to abort signal
      abortController.signal.addEventListener("abort", cleanup);

      // v5: Use sendMessage with text property
      sendMessage({ text: input });
      setInput("");
    },
    [input, sendMessage, streamingOptimization]
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
