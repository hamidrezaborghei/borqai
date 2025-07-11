import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ className, maxWidth = "full", ...props }, ref) => {
    const maxWidthClasses = {
      sm: "max-w-sm",
      md: "max-w-md",
      lg: "max-w-lg",
      xl: "max-w-xl",
      "2xl": "max-w-2xl",
      full: "max-w-full",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "mx-auto w-full px-4",
          maxWidthClasses[maxWidth],
          className
        )}
        {...props}
      />
    );
  }
);

Container.displayName = "Container";

export { Container };
