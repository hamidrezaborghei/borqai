"use client";

import { useCallback, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Chat } from "@/components/features/chat";
import { Container } from "@/components/ui/layout";

export default function ChatPageRefactored() {
  const [input, setInput] = useState("");

  const { messages, sendMessage, stop, status, error, setMessages } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
  });

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInput(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();

      if (!input.trim()) return;

      // v5: sendMessage expects { text: string } for simple text messages
      sendMessage({
        text: input,
      });

      setInput("");
    },
    [input, sendMessage]
  );

  const handleStop = useCallback(() => {
    stop();
  }, [stop]);

  const append = useCallback(
    (message: string) => {
      // v5: sendMessage with text property
      sendMessage({ text: message });
    },
    [sendMessage]
  );

  // v5: status values are different - check for streaming states
  const isGenerating = status === "streaming";

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center px-4 pt-4">
      <Container maxWidth="full" className="flex-1 flex flex-col w-full">
        <Chat
          messages={messages}
          input={input}
          className="flex-1"
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isGenerating}
          stop={handleStop}
          suggestions={[
            "Create a React component",
            "Best laptops under $1000",
            "Latest Bitcoin news",
          ]}
          append={append}
          setMessages={setMessages}
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
      </Container>
    </div>
  );
}
