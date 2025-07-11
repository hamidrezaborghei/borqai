"use client";

import { useCallback, useRef } from "react";
import { ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/base/button";
import { CopyButton } from "@/components/features/chat/copy-button";
import { MessageList } from "@/components/features/chat/message-list";
import { PromptSuggestions } from "@/components/features/chat/prompt-suggestions";
import { ChatContainer } from "./chat-container";
import { ChatMessages } from "./chat-messages";
import { ChatForm } from "./chat-form";
import { MessageInput } from "./message-input";
import {
  isToolUIPart,
  UIDataTypes,
  UIMessage,
  UIMessagePart,
  UITools,
} from "ai";

interface ChatPropsBase {
  handleSubmit: (
    event?: { preventDefault?: () => void },
    options?: { experimental_attachments?: FileList }
  ) => void;
  messages: UIMessage[];
  input: string;
  className?: string;
  handleInputChange: React.ChangeEventHandler<HTMLTextAreaElement>;
  isGenerating: boolean;
  stop?: () => void;
  onRateResponse?: (
    messageId: string,
    rating: "thumbs-up" | "thumbs-down"
  ) => void;
  setMessages?: (messages: UIMessage[]) => void;
  transcribeAudio?: (blob: Blob) => Promise<string>;
}

interface ChatPropsWithoutSuggestions extends ChatPropsBase {
  append?: never;
  suggestions?: never;
}

interface ChatPropsWithSuggestions extends ChatPropsBase {
  append: (message: string) => void;
  suggestions: string[];
}

type ChatProps = ChatPropsWithoutSuggestions | ChatPropsWithSuggestions;

export function Chat({
  messages,
  handleSubmit,
  input,
  handleInputChange,
  stop,
  isGenerating,
  append,
  suggestions,
  className,
  onRateResponse,
  setMessages,
  transcribeAudio,
}: ChatProps) {
  const lastMessage = messages.at(-1);
  const isEmpty = messages.length === 0;
  const isTyping = lastMessage?.role === "user";

  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Enhanced stop function that marks pending tool calls as cancelled
  const handleStop = useCallback(() => {
    stop?.();

    if (!setMessages) return;

    const latestMessages = [...messagesRef.current];
    const lastAssistantMessage = latestMessages.findLast(
      (m) => m.role === "assistant"
    );

    if (!lastAssistantMessage?.parts) return;

    let needsUpdate = false;
    const updatedParts = lastAssistantMessage.parts.map((part) => {
      // Handle v5 tool parts
      if (isToolUIPart(part) && part.state === "input-available") {
        needsUpdate = true;
        return {
          ...part,
          state: "output-error",
          errorText: "Tool execution was cancelled",
        } as UIMessagePart<UIDataTypes, UITools>;
      }
      return part;
    });

    if (needsUpdate) {
      const updatedMessage = {
        ...lastAssistantMessage,
        parts: updatedParts,
      };

      const messageIndex = latestMessages.findIndex(
        (m) => m.id === lastAssistantMessage.id
      );
      if (messageIndex !== -1) {
        latestMessages[messageIndex] = updatedMessage;
        setMessages(latestMessages);
      }
    }
  }, [stop, setMessages, messagesRef]);

  // Message options for actions (copy, thumbs up/down)
  const messageOptions = useCallback(
    (message: UIMessage) => {
      const textContent =
        message.parts
          ?.filter((part) => part.type === "text")
          .map((part) => part.text)
          .join("\n\n") || "";

      return {
        actions: onRateResponse ? (
          <>
            <div className="border-r pr-1">
              <CopyButton
                content={textContent}
                copyMessage="Copied response to clipboard!"
              />
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              aria-label="Thumbs up"
              onClick={() => onRateResponse(message.id, "thumbs-up")}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              aria-label="Thumbs down"
              onClick={() => onRateResponse(message.id, "thumbs-down")}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <CopyButton
            content={textContent}
            copyMessage="Copied response to clipboard!"
          />
        ),
      };
    },
    [onRateResponse]
  );

  return (
    <ChatContainer className={className}>
      {isEmpty && append && suggestions ? (
        <PromptSuggestions
          label="Try these prompts ✨"
          append={(message) => append(message.content)}
          suggestions={suggestions}
        />
      ) : null}

      {messages.length > 0 && (
        <ChatMessages messages={messages}>
          <MessageList
            messages={messages}
            isTyping={isTyping}
            messageOptions={messageOptions}
          />
        </ChatMessages>
      )}

      <ChatForm className="mt-auto" handleSubmit={handleSubmit}>
        {({ files, setFiles }) => (
          <MessageInput
            value={input}
            onChange={handleInputChange}
            allowAttachments
            files={files}
            setFiles={setFiles}
            stop={handleStop}
            isGenerating={isGenerating}
            transcribeAudio={transcribeAudio}
          />
        )}
      </ChatForm>
    </ChatContainer>
  );
}

Chat.displayName = "Chat";
