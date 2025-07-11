import React, { useCallback } from "react";
import { getIconConfig, ProgressItem } from "./progress-item";
import { ChevronRight, Menu } from "lucide-react";

export default React.memo(function MobileProgressHeader({
  latestProgressItem,
  isProgressOpen,
  onToggle,
}: {
  latestProgressItem: ProgressItem | null;
  isProgressOpen: boolean;
  onToggle: () => void;
}) {
  const renderProgressIcon = useCallback((item: ProgressItem) => {
    const iconConfig = getIconConfig(item);
    const IconComponent = iconConfig.icon;
    return (
      <IconComponent
        className={iconConfig.className.replace("h-4 w-4", "h-3 w-3")}
      />
    );
  }, []);

  return (
    <div className="lg:hidden flex-shrink-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted/70 transition-colors"
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Menu className="h-4 w-4 flex-shrink-0" />
          {latestProgressItem && !isProgressOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {renderProgressIcon(latestProgressItem)}
              <span className="truncate text-xs">
                {latestProgressItem.content}
              </span>
            </div>
          ) : (
            <span className="font-semibold">Progress</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>
    </div>
  );
});
