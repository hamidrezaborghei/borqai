import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export type ChatContainerProps = React.HTMLAttributes<HTMLDivElement>;

const ChatContainer = forwardRef<HTMLDivElement, ChatContainerProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("grid max-h-full w-full grid-rows-[1fr_auto]", className)}
        {...props}
      />
    );
  }
);

ChatContainer.displayName = "ChatContainer";

export { ChatContainer };
