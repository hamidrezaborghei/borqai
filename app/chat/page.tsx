"use client";
import { Chat } from "@/components/ui/chat";
import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect } from "react";
import { useStreamingOptimization } from "@/hooks/use-streaming-optimization";

export default function ChatPage() {
  // Initialize performance monitoring

  // Initialize streaming optimization
  const streamingOptimization = useStreamingOptimization({
    maxRetries: 3,
    retryDelay: 1000,
    timeoutMs: 60000,
  });

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
    append,
    error,
  } = useChat({
    api: "/api/chat",
    onError: (error) => {
      console.error("Chat error:", error);
    },
    onFinish: () => {
      streamingOptimization.reset();
    },
  });

  const isLoading = status === "streaming";

  // Enhanced submit handler with streaming optimization
  const handleSubmit = useCallback(
    (
      event?: { preventDefault?: () => void },
      options?: { experimental_attachments?: FileList }
    ) => {
      const abortController = streamingOptimization.createAbortController();

      const cleanup = streamingOptimization.setRequestTimeout(() => {
        console.warn("Chat request timed out after 60 seconds");
      });

      // Add cleanup to abort signal
      abortController.signal.addEventListener("abort", cleanup);

      originalHandleSubmit(event, options);
    },
    [originalHandleSubmit, streamingOptimization]
  );

  // Enhanced stop function with throttling
  const handleStop = useCallback(() => {
    streamingOptimization.abort();
    stop();
  }, [streamingOptimization, stop]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingOptimization.abort();
    };
  }, [streamingOptimization]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-4 pt-4 ">
      <div className="max-w-7xl flex-1 flex flex-col w-full">
        <Chat
          messages={messages}
          input={input}
          className="flex-1"
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isLoading}
          stop={handleStop}
          suggestions={[
            "Create a React component",
            "Best laptops under $1000",
            "Latest Bitcoin news",
          ]}
          append={append}
        />
        {error && (
          <div className="text-red-500 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
            <strong>Error:</strong> {error.message}
            {error.message.includes("timeout") && (
              <div className="mt-2 text-sm">
                The request took too long to complete. Please try again with a
                shorter message.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
