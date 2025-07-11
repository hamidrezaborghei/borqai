import React, { useMemo } from "react";
import { Loader2, CheckCircle, Terminal, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressItem {
  id: string;
  type: "thinking" | "tool-call" | "tool-result" | "step";
  content: string;
  toolName?: string;
  status?: "active" | "completed" | "cancelled";
  timestamp: Date;
  promptIndex?: number;
}

export const ICON_CONFIG = {
  thinking: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: Brain, className: "h-4 w-4 text-green-500" },
    default: { icon: Brain, className: "h-4 w-4 text-green-500" },
  },
  "tool-call": {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: Terminal, className: "h-4 w-4 text-green-500" },
    default: { icon: Terminal, className: "h-4 w-4 text-green-500" },
  },
  "tool-result": {
    completed: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
    default: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
  },
  step: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: CheckCircle, className: "h-4 w-4 text-green-500" },
    default: { icon: CheckCircle, className: "h-4 w-4 text-gray-500" },
  },
} as const;

const STATUS_STYLES = {
  active: {
    text: "text-orange-500",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
  },
  completed: {
    text: "text-green-500",
    bg: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  },
  cancelled: {
    text: "text-red-500",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  },
  default: {
    text: "text-gray-500",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800",
  },
} as const;

export const getIconConfig = (item: ProgressItem) => {
  const type = item.type;
  const status = item.status || "default";

  if (type in ICON_CONFIG) {
    const typeConfig = ICON_CONFIG[type as keyof typeof ICON_CONFIG];
    const statusConfig = typeConfig[status as keyof typeof typeConfig];
    if (statusConfig) {
      return statusConfig;
    }
    // Fallback to default, then completed
    return typeConfig.default || typeConfig.completed;
  }

  return ICON_CONFIG.step.default;
};

const getStatusStyles = (status: string) => {
  return (
    STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.default
  );
};

export const ProgressItemComponent = React.memo(function ProgressItemComponent({
  item,
}: {
  item: ProgressItem;
}) {
  const iconConfig = useMemo(
    () => getIconConfig(item),
    [item.type, item.status]
  );
  const styles = useMemo(
    () => getStatusStyles(item.status || "default"),
    [item.status]
  );

  const IconComponent = iconConfig.icon;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
        styles.bg
      )}
    >
      <IconComponent className={iconConfig.className} />
      <span className={cn("flex-1", styles.text)}>{item.content}</span>
    </div>
  );
});
