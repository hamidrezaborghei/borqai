"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useStreamingOptimization } from "@/hooks/use-streaming-optimization";
import { useChat } from "@ai-sdk/react";
import { MessageInput } from "@/components/ui/message-input";
import { AnimatedList } from "@/components/magicui/animated-list";
import {
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Search,
  Brain,
  FileText,
  Download,
  Database,
  Target,
  Lightbulb,
  BookOpen,
  Menu,
  X,
  Clock,
  Globe,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { UIMessage } from "ai";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

// Types for research progress tracking
interface ResearchProgressItem {
  id: string;
  type:
    | "search"
    | "extract"
    | "analyze"
    | "axiom"
    | "finding"
    | "question"
    | "save"
    | "report";
  content: string;
  status?: "active" | "completed" | "error";
  timestamp: Date;
  metadata?: {
    source?: string;
    depth?: number;
    findingsCount?: number;
    axiomsCount?: number;
  };
}

interface ResearchSession {
  sessionId: string;
  query: string;
  items: ResearchProgressItem[];
  isActive: boolean;
  timestamp: Date;
  summary?: {
    totalFindings: number;
    totalAxioms: number;
    totalSources: number;
    completed: boolean;
  };
}

// Icon configuration for different research activities
const RESEARCH_ICON_CONFIG = {
  search: {
    active: { icon: Loader2, className: "h-4 w-4 animate-spin text-blue-500" },
    completed: { icon: Search, className: "h-4 w-4 text-blue-500" },
    error: { icon: Search, className: "h-4 w-4 text-red-500" },
  },
  extract: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-purple-500",
    },
    completed: { icon: Globe, className: "h-4 w-4 text-purple-500" },
    error: { icon: Globe, className: "h-4 w-4 text-red-500" },
  },
  analyze: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-orange-500",
    },
    completed: { icon: Brain, className: "h-4 w-4 text-orange-500" },
    error: { icon: Brain, className: "h-4 w-4 text-red-500" },
  },
  axiom: {
    active: { icon: Loader2, className: "h-4 w-4 animate-spin text-green-500" },
    completed: { icon: Target, className: "h-4 w-4 text-green-500" },
    error: { icon: Target, className: "h-4 w-4 text-red-500" },
  },
  finding: {
    active: {
      icon: Loader2,
      className: "h-4 w-4 animate-spin text-indigo-500",
    },
    completed: { icon: Lightbulb, className: "h-4 w-4 text-indigo-500" },
    error: { icon: Lightbulb, className: "h-4 w-4 text-red-500" },
  },
  question: {
    active: { icon: Loader2, className: "h-4 w-4 animate-spin text-cyan-500" },
    completed: { icon: BookOpen, className: "h-4 w-4 text-cyan-500" },
    error: { icon: BookOpen, className: "h-4 w-4 text-red-500" },
  },
  save: {
    active: { icon: Loader2, className: "h-4 w-4 animate-spin text-teal-500" },
    completed: { icon: Database, className: "h-4 w-4 text-teal-500" },
    error: { icon: Database, className: "h-4 w-4 text-red-500" },
  },
  report: {
    active: { icon: Loader2, className: "h-4 w-4 animate-spin text-pink-500" },
    completed: { icon: FileText, className: "h-4 w-4 text-pink-500" },
    error: { icon: FileText, className: "h-4 w-4 text-red-500" },
  },
};

const STATUS_STYLES = {
  active: {
    text: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800",
  },
  completed: {
    text: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-800",
  },
  error: {
    text: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800",
  },
  default: {
    text: "text-gray-600 dark:text-gray-400",
    bg: "bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800",
  },
};

// Utility functions
const getResearchIconConfig = (item: ResearchProgressItem) => {
  const type = item.type;
  const status = item.status || "completed";

  if (type in RESEARCH_ICON_CONFIG) {
    const typeConfig =
      RESEARCH_ICON_CONFIG[type as keyof typeof RESEARCH_ICON_CONFIG];
    return (
      typeConfig[status as keyof typeof typeConfig] || typeConfig.completed
    );
  }

  return RESEARCH_ICON_CONFIG.search.completed;
};

const getStatusStyles = (status: string) => {
  return (
    STATUS_STYLES[status as keyof typeof STATUS_STYLES] || STATUS_STYLES.default
  );
};

// Memoized components
const ResearchProgressItem = React.memo(function ResearchProgressItem({
  item,
}: {
  item: ResearchProgressItem;
}) {
  const iconConfig = useMemo(
    () => getResearchIconConfig(item),
    [item.type, item.status]
  );
  const styles = useMemo(
    () => getStatusStyles(item.status || "completed"),
    [item.status]
  );

  const IconComponent = iconConfig.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors",
        styles.bg
      )}
    >
      <div className="flex-shrink-0 mt-0.5">
        <IconComponent className={iconConfig.className} />
      </div>
      <div className="flex-1 min-w-0">
        <div className={cn("font-medium", styles.text)}>{item.content}</div>
        {item.metadata && (
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            {item.metadata.source && (
              <div className="truncate">Source: {item.metadata.source}</div>
            )}
            {item.metadata.depth !== undefined && (
              <div>Depth: Level {item.metadata.depth}</div>
            )}
            {item.metadata.findingsCount !== undefined && (
              <div>Findings: {item.metadata.findingsCount}</div>
            )}
            {item.metadata.axiomsCount !== undefined && (
              <div>Axioms: {item.metadata.axiomsCount}</div>
            )}
          </div>
        )}
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          <Clock className="inline h-3 w-3 mr-1" />
          {item.timestamp.toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
});

const ResearchSessionAccordion = React.memo(function ResearchSessionAccordion({
  session,
  isDefaultOpen = false,
}: {
  session: ResearchSession;
  isDefaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(isDefaultOpen);

  const handleToggle = useCallback((open: boolean) => {
    setIsOpen(open);
  }, []);

  return (
    <Collapsible open={isOpen} onOpenChange={handleToggle}>
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border bg-muted/50 px-4 py-3 text-sm font-medium hover:bg-muted/70 transition-colors">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
              Research
            </span>
          </div>
          <span className="truncate font-medium">{session.query}</span>
          {session.isActive && (
            <Loader2 className="h-3 w-3 animate-spin text-orange-500 flex-shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {session.summary && (
            <div className="text-xs text-gray-500 hidden sm:flex items-center gap-2">
              <span>{session.summary.totalFindings} findings</span>
              <span>{session.summary.totalAxioms} axioms</span>
              {session.summary.completed && (
                <CheckCircle className="h-3 w-3 text-green-500" />
              )}
            </div>
          )}
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className="pl-4">
          <AnimatedList delay={200} className="space-y-2">
            {session.items.map((item) => (
              <ResearchProgressItem key={item.id} item={item} />
            ))}
          </AnimatedList>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
});

const MobileResearchHeader = React.memo(function MobileResearchHeader({
  latestItem,
  isProgressOpen,
  onToggle,
}: {
  latestItem: ResearchProgressItem | null;
  isProgressOpen: boolean;
  onToggle: () => void;
}) {
  const renderProgressIcon = useCallback((item: ResearchProgressItem) => {
    const iconConfig = getResearchIconConfig(item);
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
          {latestItem && !isProgressOpen ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {renderProgressIcon(latestItem)}
              <span className="truncate text-xs">{latestItem.content}</span>
            </div>
          ) : (
            <span className="font-semibold">Research Progress</span>
          )}
        </div>
        <ChevronRight className="h-4 w-4 flex-shrink-0" />
      </button>
    </div>
  );
});

// Custom hook for parsing research progress
function useResearchProgress(
  messages: UIMessage[],
  status: string
): ResearchSession[] {
  return useMemo(() => {
    if (!messages.length) return [];

    const sessions: ResearchSession[] = [];
    let currentSession: ResearchSession | null = null;

    messages.forEach((message, messageIndex) => {
      if (message.role === "user" && message.parts?.length) {
        // Start new research session
        const userContent =
          message.parts.find((part) => part.type === "text")?.text ||
          "Research Query";
        currentSession = {
          sessionId: `session-${messageIndex}`,
          query: userContent,
          items: [],
          isActive:
            messageIndex === messages.length - 2 && status === "streaming", // Last user message
          timestamp: message.createdAt || new Date(),
        };
        sessions.push(currentSession);
      } else if (
        message.role === "assistant" &&
        currentSession &&
        message.parts?.length
      ) {
        // Parse assistant messages for research activities
        message.parts.forEach((part, partIndex) => {
          if (part.type === "text" && part.text) {
            // Extract research activities from text
            const text = part.text.toLowerCase();
            let type: ResearchProgressItem["type"] = "analyze";
            let content = part.text;

            if (text.includes("searching") || text.includes("search")) {
              type = "search";
              content = "Searching the web for relevant information";
            } else if (
              text.includes("extracting") ||
              text.includes("extract")
            ) {
              type = "extract";
              content = "Extracting detailed content from sources";
            } else if (text.includes("axiom") || text.includes("fundamental")) {
              type = "axiom";
              content = "Identifying fundamental axioms and principles";
            } else if (
              text.includes("finding") ||
              text.includes("discovered")
            ) {
              type = "finding";
              content = "Recording new research finding";
            } else if (
              text.includes("question") ||
              text.includes("follow-up")
            ) {
              type = "question";
              content = "Generating follow-up research questions";
            } else if (text.includes("saving") || text.includes("knowledge")) {
              type = "save";
              content = "Saving research to knowledge file";
            } else if (text.includes("report") || text.includes("pdf")) {
              type = "report";
              content = "Generating comprehensive PDF report";
            }

            const item: ResearchProgressItem = {
              id: `item-${messageIndex}-${partIndex}`,
              type,
              content:
                content.length > 100
                  ? content.substring(0, 100) + "..."
                  : content,
              status:
                currentSession?.isActive &&
                partIndex === message.parts!.length - 1
                  ? "active"
                  : "completed",
              timestamp: message.createdAt || new Date(),
            };

            currentSession?.items.push(item);
          }

          // Handle tool invocations
          if (part.type === "tool-invocation" && part.toolInvocation) {
            const toolName = part.toolInvocation.toolName;
            let type: ResearchProgressItem["type"] = "analyze";
            let content = `Using ${toolName}`;

            if (toolName === "searchWeb") {
              type = "search";
              content = "Searching web for information";
            } else if (toolName === "extractWebContent") {
              type = "extract";
              content = "Extracting content from web sources";
            } else if (toolName === "identifyAxioms") {
              type = "axiom";
              content = "Analyzing content for fundamental axioms";
            } else if (toolName === "manageResearchState") {
              type = "finding";
              content = "Managing research state and findings";
            } else if (toolName === "generateFollowUpQuestions") {
              type = "question";
              content = "Generating deeper follow-up questions";
            } else if (toolName === "saveKnowledgeFile") {
              type = "save";
              content = "Saving research to knowledge file";
            } else if (toolName === "generatePDFReport") {
              type = "report";
              content = "Generating PDF research report";
            }

            const item: ResearchProgressItem = {
              id: `tool-${messageIndex}-${partIndex}`,
              type,
              content,
              status:
                part.toolInvocation.state === "call" ? "active" : "completed",
              timestamp: message.createdAt || new Date(),
            };

            if (currentSession) {
              currentSession.items.push(item);
            }
          }
        });

        // Update session summary if completed
        if (currentSession && !currentSession.isActive) {
          const findingsCount = currentSession.items.filter(
            (item) => item.type === "finding"
          ).length;
          const axiomsCount = currentSession.items.filter(
            (item) => item.type === "axiom"
          ).length;
          const sourcesCount = currentSession.items.filter(
            (item) => item.type === "extract"
          ).length;

          currentSession.summary = {
            totalFindings: findingsCount,
            totalAxioms: axiomsCount,
            totalSources: sourcesCount,
            completed: currentSession.items.some(
              (item) => item.type === "report"
            ),
          };
        }
      }
    });

    return sessions;
  }, [messages, status]);
}

function useLatestResearchItem(
  sessions: ResearchSession[],
  isProgressOpen: boolean
) {
  return useMemo(() => {
    if (isProgressOpen || !sessions.length) return null;

    const latestSession = sessions[sessions.length - 1];
    if (!latestSession || !latestSession.items.length) return null;

    // Find active item or return last item
    const activeItem = latestSession.items.find(
      (item) => item.status === "active"
    );
    return (
      activeItem || latestSession.items[latestSession.items.length - 1] || null
    );
  }, [sessions, isProgressOpen]);
}

// Main component
export default function ResearchPage() {
  const [isProgressOpen, setIsProgressOpen] = useState(false);

  // Initialize streaming optimization for research
  const streamingOptimization = useStreamingOptimization({
    maxRetries: 2,
    retryDelay: 3000,
    timeoutMs: 600000, // 10 minutes for deep research
  });

  const {
    input,
    handleInputChange,
    handleSubmit: originalHandleSubmit,
    status,
    stop,
    messages,
    error,
  } = useChat({
    api: "/api/research",
    streamProtocol: "data",
    onError: (error) => {
      console.error("Research error:", error);
    },
    onFinish: () => {
      streamingOptimization.reset();
    },
  });

  // Parse research progress
  const researchSessions = useResearchProgress(messages, status);
  const latestResearchItem = useLatestResearchItem(
    researchSessions,
    isProgressOpen
  );

  // Enhanced submit handler
  const handleSubmit = useCallback(
    (event?: React.FormEvent<HTMLFormElement>) => {
      const abortController = streamingOptimization.createAbortController();

      const cleanup = streamingOptimization.setRequestTimeout(() => {
        console.warn("Research request timed out after 10 minutes");
      });

      abortController.signal.addEventListener("abort", cleanup);
      originalHandleSubmit(event);
    },
    [originalHandleSubmit, streamingOptimization]
  );

  const handleStop = useCallback(() => {
    streamingOptimization.abort();
    stop();
  }, [streamingOptimization, stop]);

  const handleProgressToggle = useCallback(() => {
    setIsProgressOpen((prev) => !prev);
  }, []);

  const handleProgressClose = useCallback(() => {
    setIsProgressOpen(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingOptimization.abort();
    };
  }, [streamingOptimization]);

  return (
    <div className="flex h-screen w-full flex-col lg:flex-row gap-4 lg:gap-8 px-4 pt-4 pb-4">
      {/* Mobile Progress Header */}
      <MobileResearchHeader
        latestItem={latestResearchItem}
        isProgressOpen={isProgressOpen}
        onToggle={handleProgressToggle}
      />

      {/* Mobile Progress Drawer */}
      <>
        {/* Backdrop */}
        <div
          className={cn(
            "lg:hidden fixed inset-0 bg-black/50 z-40 transition-opacity duration-300",
            isProgressOpen ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
          onClick={handleProgressClose}
        />

        {/* Drawer */}
        <div
          className={cn(
            "lg:hidden fixed inset-y-0 left-0 w-80 max-w-[85vw] bg-background border-r z-50 flex flex-col transition-transform duration-300 ease-in-out",
            isProgressOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              <span className="text-lg font-semibold">Research Progress</span>
            </div>
            <button
              onClick={handleProgressClose}
              className="p-2 hover:bg-muted rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-3">
              {researchSessions.map((session, index) => (
                <ResearchSessionAccordion
                  key={session.sessionId}
                  session={session}
                  isDefaultOpen={index === researchSessions.length - 1}
                />
              ))}
            </div>
          </div>
        </div>
      </>

      {/* Desktop Progress Sidebar */}
      <div className="hidden lg:flex lg:w-1/3 flex-col gap-4 min-h-0">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <span className="text-lg font-semibold">Research Progress</span>
        </div>
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {researchSessions.map((session, index) => (
            <ResearchSessionAccordion
              key={session.sessionId}
              session={session}
              isDefaultOpen={index === researchSessions.length - 1}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:flex-2/3 flex flex-col gap-4 min-h-0">
        {/* Header */}
        <div className="flex-shrink-0 text-center py-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-primary/10">
              <Brain className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Deep Research Agent</h1>
              <p className="text-muted-foreground mt-1">
                Autonomous research until fundamental axioms are reached
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4" />
              <span>Multi-level analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              <span>Axiom identification</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>PDF reports</span>
            </div>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              <span>Knowledge files</span>
            </div>
          </div>
        </div>

        {/* Research Results Display */}
        <div className="flex-1 min-h-0 overflow-auto">
          {researchSessions.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center max-w-md">
                {/* <Brain className="h-16 w-16 text-muted-foreground mx-auto mb-4" /> */}
                <h3 className="text-lg font-semibold mb-2">
                  Start Deep Research
                </h3>
                <p className="text-muted-foreground mb-4">
                  Enter a research topic below and the agent will conduct
                  autonomous research until it reaches fundamental axioms and
                  principles.
                </p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Searches multiple sources</p>
                  <p>• Generates follow-up questions</p>
                  <p>• Identifies fundamental axioms</p>
                  <p>• Creates knowledge files and PDF reports</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="space-y-6">
                {researchSessions.map((session) => (
                  <div
                    key={session.sessionId}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-lg">{session.query}</h3>
                      {session.summary && (
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{session.summary.totalFindings} findings</span>
                          <span>{session.summary.totalAxioms} axioms</span>
                          <span>{session.summary.totalSources} sources</span>
                          {session.summary.completed && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span>Complete</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {session.summary?.completed && (
                      <div className="flex gap-2 mb-4">
                        <button className="flex items-center gap-2 px-3 py-2 bg-primary/10 text-primary rounded-md text-sm hover:bg-primary/20 transition-colors">
                          <Download className="h-4 w-4" />
                          Download PDF Report
                        </button>
                        <button className="flex items-center gap-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md text-sm hover:bg-secondary/80 transition-colors">
                          <Database className="h-4 w-4" />
                          View Knowledge File
                        </button>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      Started: {session.timestamp.toLocaleString()}
                      {session.isActive && (
                        <span className="ml-2 text-orange-600">
                          • Research in progress
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex-shrink-0">
          <form onSubmit={handleSubmit} autoComplete="off">
            <MessageInput
              value={input}
              onChange={handleInputChange}
              isGenerating={status === "streaming"}
              stop={handleStop}
              placeholder="Enter your research topic (e.g., 'What are the fundamental principles of quantum mechanics?')"
            />
          </form>
          {error && (
            <div className="mt-2 text-red-500 p-4 rounded-lg bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-800">
              <strong>Error:</strong> {error.message}
              {error.message.includes("timeout") && (
                <div className="mt-2 text-sm">
                  The research took too long to complete. The agent may still be
                  working in the background.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
