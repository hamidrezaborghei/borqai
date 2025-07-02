import { useState, useRef, useCallback } from "react";
import { Message } from "@/components/ui/chat-message";

export function useCustomChat(apiUrl: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  const stop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setIsGenerating(false);
  }, []);

  const handleSubmit = useCallback(
    async (event?: { preventDefault?: () => void }) => {
      event?.preventDefault?.();
      if (!input.trim()) return;

      const userMessage: Message = {
        id: `${Date.now()}-user`,
        role: "user",
        content: input,
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput("");
      setIsGenerating(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: [...messages, userMessage] }),
          signal: abortController.signal,
        });

        if (!response.body) throw new Error("No response body");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf("\n");
          while (boundary !== -1) {
            const line = buffer.slice(0, boundary).trim();
            buffer = buffer.slice(boundary + 1);

            if (line) {
              try {
                const msg: Message = JSON.parse(line);
                setMessages((prev) => [...prev, msg]);
              } catch (e) {
                // Ignore parse errors
              }
            }
            boundary = buffer.indexOf("\n");
          }
        }
      } catch (err) {
        // Optionally handle error
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [apiUrl, input, messages]
  );

  return {
    messages,
    setMessages,
    input,
    setInput,
    handleInputChange,
    handleSubmit,
    isGenerating,
    stop,
  };
}
