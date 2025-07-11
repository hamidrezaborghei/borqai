import { AnimatedList } from "@/components/magicui/animated-list";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import React, { useCallback, useState } from "react";
import { ProgressItemComponent } from "./progress-item";

export default React.memo(function PromptAccordion({
  group,
  isDefaultOpen = false,
  keyPrefix = "",
}: {
  group: PromptGroup;
  isDefaultOpen?: boolean;
  keyPrefix?: string;
}) {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  const handleToggle = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted/70 transition-colors">
        <div className="flex items-center gap-3">
          <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
            {group.promptIndex + 1}
          </span>
          <span className="truncate max-w-[200px]">{group.userMessage}</span>
          {group.isActive && (
            <Loader2 className="h-3 w-3 animate-spin text-orange-500" />
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="pl-4">
          <AnimatedList delay={300} className="space-y-2">
            {group.items.map((item) => (
              <ProgressItemComponent
                key={`${keyPrefix}${item.id}`}
                item={item}
              />
            ))}
          </AnimatedList>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});
