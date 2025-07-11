import { getToolName, isToolUIPart, UIMessage } from "ai";
import { useMemo } from "react";

export function useProgressGroups(
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
        timestamp: new Date(),
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
          // Handle reasoning/thinking - v5 uses 'text' property
          if (part.type === "reasoning") {
            const isLastReasoning =
              isActiveGroup &&
              assistantMsg ===
                group.assistantMsgs[group.assistantMsgs.length - 1] &&
              part === assistantMsg.parts[assistantMsg.parts.length - 1];

            const reasoningText = part.text || ""; // v5: use 'text' instead of 'reasoning'

            items.push({
              id: `thinking-${group.promptIndex}-${thinkingCounter}`,
              type: "thinking",
              content:
                reasoningText.length > 100
                  ? `${reasoningText.substring(0, 100)}...`
                  : reasoningText, // Truncate long reasoning
              status:
                isLastReasoning && status === "streaming"
                  ? "active"
                  : "completed",
              timestamp: new Date(),
              promptIndex: group.promptIndex,
            });
            thinkingCounter++;
          }

          // Handle v5 tool parts - use isToolUIPart and getToolName utilities
          if (isToolUIPart(part)) {
            const toolName = getToolName(part) || `tool-${toolCallCounter}`;

            // Handle different tool states in v5
            if (
              part.state === "input-available" ||
              part.state === "input-streaming"
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
                  timestamp: new Date(),
                  promptIndex: group.promptIndex,
                });
                processedToolCalls.add(toolCallId);
                toolCallCounter++;
              }
            }

            if (part.state === "output-available") {
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
                timestamp: new Date(),
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
          timestamp: new Date(),
          promptIndex: group.promptIndex,
        });
      }

      groups.push({
        promptIndex: group.promptIndex,
        userMessage: userContent,
        items,
        isActive: isActiveGroup,
        timestamp: new Date(),
      });
    }

    return groups;
  }, [messages, status]);
}

export function useWebsiteResult(messages: UIMessage[]): WebsiteResult | null {
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

export function useLatestProgressItem(
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
