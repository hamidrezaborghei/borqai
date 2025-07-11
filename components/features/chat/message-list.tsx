import {
  ChatMessage,
  type ChatMessageProps,
} from "@/components/features/chat/chat-message";
import { TypingIndicator } from "@/components/features/chat/typing-indicator";
import { UIMessage } from "ai";

type AdditionalMessageOptions = Omit<ChatMessageProps, keyof UIMessage>;

interface MessageListProps {
  messages: UIMessage[];
  showTimeStamps?: boolean;
  isTyping?: boolean;
  messageOptions?:
    | AdditionalMessageOptions
    | ((message: UIMessage) => AdditionalMessageOptions);
}

export function MessageList({
  messages,
  showTimeStamps = true,
  isTyping = false,
  messageOptions,
}: MessageListProps) {
  return (
    <div className="space-y-4 overflow-visible">
      {messages.map((message, index) => {
        const additionalOptions =
          typeof messageOptions === "function"
            ? messageOptions(message)
            : messageOptions;

        return (
          <ChatMessage
            key={message.id || index}
            showTimeStamp={showTimeStamps}
            {...message}
            {...additionalOptions}
          />
        );
      })}
      {isTyping && <TypingIndicator />}
    </div>
  );
}
