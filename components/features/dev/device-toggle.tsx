import React, { useCallback } from "react";
import { Laptop, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DeviceToggleProps {
  mockup: "safari" | "iphone";
  onMockupChange: (mockup: "safari" | "iphone") => void;
}

export const DeviceToggle = React.memo(function DeviceToggle({
  mockup,
  onMockupChange,
}: DeviceToggleProps) {
  const handleSafariClick = useCallback(() => {
    onMockupChange("safari");
  }, [onMockupChange]);

  const handleIphoneClick = useCallback(() => {
    onMockupChange("iphone");
  }, [onMockupChange]);

  return (
    <div className="flex items-center justify-center gap-2 p-2 bg-muted/50 rounded-lg w-fit mx-auto flex-shrink-0">
      <button
        onClick={handleSafariClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          mockup === "safari"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        )}
      >
        <Laptop className="h-4 w-4" />
        <span className="hidden sm:inline">Desktop</span>
      </button>
      <button
        onClick={handleIphoneClick}
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
          mockup === "iphone"
            ? "bg-primary text-primary-foreground"
            : "hover:bg-muted"
        )}
      >
        <Smartphone className="h-4 w-4" />
        <span className="hidden sm:inline">Mobile</span>
      </button>
    </div>
  );
});
