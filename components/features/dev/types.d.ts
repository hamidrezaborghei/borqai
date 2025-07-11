type WebsiteResult = {
  html: string;
};

interface ProgressItem {
  id: string;
  type: "thinking" | "tool-call" | "tool-result" | "step";
  content: string;
  toolName?: string;
  status?: "active" | "completed" | "cancelled";
  timestamp: Date;
  promptIndex?: number;
}

interface PromptGroup {
  promptIndex: number;
  userMessage: string;
  items: ProgressItem[];
  isActive: boolean;
  timestamp: Date;
}
