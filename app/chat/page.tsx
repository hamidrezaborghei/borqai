"use client";
import { Chat } from "@/components/ui/chat";
import { useChat } from "@ai-sdk/react";

export default function ChatPage() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    status,
    stop,
    append,
    error,
  } = useChat({
    api: "/api/chat",
  });

  const isLoading = status === "streaming";

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
          stop={stop}
          suggestions={[
            "Create a React component",
            "Best laptops under $1000",
            "Latest Bitcoin news",
          ]}
          append={append}
        />
        {error && (
          <div className="text-red-500 p-4">Error: {error.message}</div>
        )}
      </div>
    </div>
  );
}
