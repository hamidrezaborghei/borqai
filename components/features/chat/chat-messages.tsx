import React from "react";
import { ArrowDown } from "lucide-react";
import { UIMessage } from "ai";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Button } from "@/components/ui/base/button";

export interface ChatMessagesProps extends React.PropsWithChildren {
  messages: UIMessage[];
}

export function ChatMessages({ messages, children }: ChatMessagesProps) {
  const {
    containerRef,
    scrollToBottom,
    handleScroll,
    shouldAutoScroll,
    handleTouchStart,
  } = useAutoScroll([messages]);

  return (
    <div
      className="grid grid-cols-1 overflow-y-auto pb-4"
      ref={containerRef}
      onScroll={handleScroll}
      onTouchStart={handleTouchStart}
    >
      <div className="max-w-full [grid-column:1/1] [grid-row:1/1]">
        {children}
      </div>

      {!shouldAutoScroll && (
        <div className="pointer-events-none flex flex-1 items-end justify-end [grid-column:1/1] [grid-row:1/1]">
          <div className="sticky bottom-0 left-0 flex w-full justify-end">
            <Button
              onClick={scrollToBottom}
              className="pointer-events-auto h-8 w-8 rounded-full ease-in-out animate-in fade-in-0 slide-in-from-bottom-1"
              size="icon"
              variant="ghost"
              aria-label="Scroll to bottom"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
