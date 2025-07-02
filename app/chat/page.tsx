"use client";
import { Chat } from "@/components/ui/chat";
import { useChat } from "@ai-sdk/react";
export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, status, stop } =
    useChat({
      api: "/api/chat",
    });

  const isLoading = status === "submitted" || status === "streaming";
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center ">
      <div className="max-w-7xl flex-1 flex flex-col w-full">
        <Chat
          messages={messages}
          input={input}
          className="flex-1"
          handleInputChange={handleInputChange}
          handleSubmit={handleSubmit}
          isGenerating={isLoading}
          stop={stop}
        />
      </div>
    </div>
  );
}
