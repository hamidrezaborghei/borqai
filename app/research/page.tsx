"use client";

import React, { useCallback, useEffect, useState, useMemo } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  Node,
  Edge,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Loader2,
  Search,
  Download,
  FileText,
  Brain,
  Target,
} from "lucide-react";
import { toast } from "sonner";

// Research node data interface
interface ResearchNodeData extends Record<string, unknown> {
  concept: string;
  status: "idle" | "loading" | "completed";
  isAxiom: boolean;
  depth: number;
  researchData?: string;
}

// Type for React Flow nodes with research data
type ResearchNode = Node<ResearchNodeData>;

// Props interface for the custom node component
interface ResearchNodeProps {
  data: ResearchNodeData;
  selected: boolean;
}

// Tool invocation result interfaces
interface TreeUpdateResult {
  nodeId: string;
  concept: string;
  parentId?: string;
  depth: number;
  status: "idle" | "loading" | "completed";
  researchData?: string;
  isAxiom: boolean;
}

interface BreakdownResult {
  parentNodeId: string;
  concept: string;
  researchSummary: string;
  subConcepts: Array<{
    nodeId: string;
    concept: string;
    isAxiom: boolean;
    reasoning: string;
  }>;
}

// Custom Research Node Component
function ResearchNode({ data, selected }: ResearchNodeProps) {
  const getNodeColor = (status: string, isAxiom: boolean) => {
    if (isAxiom)
      return "bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700";
    switch (status) {
      case "idle":
        return "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600";
      case "loading":
        return "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700";
      case "completed":
        return "bg-purple-100 border-purple-300 dark:bg-purple-900/20 dark:border-purple-700";
      default:
        return "bg-gray-100 border-gray-300 dark:bg-gray-800 dark:border-gray-600";
    }
  };

  const getStatusIcon = (status: string, isAxiom: boolean) => {
    if (isAxiom) return "🎯";
    switch (status) {
      case "idle":
        return "⏳";
      case "loading":
        return "🔍";
      case "completed":
        return "✅";
      default:
        return "❓";
    }
  };

  const getStatusText = (status: string, isAxiom: boolean) => {
    if (isAxiom) return "Axiom";
    switch (status) {
      case "idle":
        return "Idle";
      case "loading":
        return "Loading";
      case "completed":
        return "Completed";
      default:
        return "Unknown";
    }
  };

  return (
    <Card
      className={`min-w-[200px] max-w-[300px] ${getNodeColor(
        data.status,
        data.isAxiom
      )} ${selected ? "ring-2 ring-blue-500" : ""}`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>{getStatusIcon(data.status, data.isAxiom)}</span>
          <span className="truncate">{data.concept}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1 mb-2">
          <Badge
            variant={data.isAxiom ? "default" : "secondary"}
            className="text-xs"
          >
            {getStatusText(data.status, data.isAxiom)}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Depth: {data.depth}
          </Badge>
        </div>
        {data.researchData && (
          <p className="text-xs text-muted-foreground line-clamp-3">
            {data.researchData}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// Node types for different research states
const nodeTypes = {
  researchNode: ResearchNode,
};

// Dagre layout function based on React Flow documentation
const getLayoutedElements = (
  nodes: ResearchNode[],
  edges: Edge[],
  direction = "TB"
) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  const nodeWidth = 280;
  const nodeHeight = 140;

  const isHorizontal = direction === "LR";

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: isHorizontal ? 100 : 80,
    ranksep: isHorizontal ? 200 : 150,
    edgesep: 50,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre graph with proper dimensions
  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, {
      width: nodeWidth,
      height: nodeHeight,
    });
  });

  // Add edges to dagre graph
  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  // Calculate layout
  dagre.layout(dagreGraph);

  // Apply calculated positions to nodes
  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);

    return {
      ...node,
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
      // Shift dagre node position (anchor=center center) to top left
      // to match React Flow node anchor point (top left)
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// Main Research Flow Component
function ResearchFlow() {
  const [nodes, setNodes, onNodesChange] = useNodesState<ResearchNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [researchQuery, setResearchQuery] = useState("");
  const [isResearching, setIsResearching] = useState(false);
  const [selectedNode, setSelectedNode] = useState<ResearchNode | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { fitView } = useReactFlow();

  const { messages, stop, append } = useChat({
    api: "/api/research",
    onError: (error) => {
      console.error("Research error:", error);
      toast.error("Research failed: " + error.message);
      setIsResearching(false);
    },
    onFinish: () => {
      setIsResearching(false);
      toast.success("Research completed!");
    },
  });

  // Parse messages to extract research tree data
  const parseResearchData = useCallback(() => {
    const nodeMap = new Map<string, ResearchNode>();
    const edgeMap = new Map<string, Edge>();

    // Parse tool calls from messages to build tree
    messages.forEach((message) => {
      if (message.role === "assistant" && message.toolInvocations) {
        message.toolInvocations.forEach((tool) => {
          // Handle updateResearchTree tool calls
          if (
            tool.toolName === "updateResearchTree" &&
            tool.state === "result"
          ) {
            const result = tool.result as TreeUpdateResult;
            const nodeId = result.nodeId;

            nodeMap.set(nodeId, {
              id: nodeId,
              type: "researchNode",
              position: { x: 0, y: 0 },
              data: {
                concept: result.concept,
                status: result.status,
                isAxiom: result.isAxiom,
                depth: result.depth,
                researchData: result.researchData || "",
              },
            });

            // Create edge to parent if specified
            if (result.parentId && nodeMap.has(result.parentId)) {
              const edgeId = `edge-${result.parentId}-${nodeId}`;
              const isLoading = result.status === "loading";
              const isAxiom = result.isAxiom;

              let edgeColor = "#6b7280"; // default gray
              if (isLoading) edgeColor = "#3b82f6"; // blue for loading
              else if (isAxiom) edgeColor = "#10b981"; // green for axioms
              else if (result.status === "completed") edgeColor = "#8b5cf6"; // purple for completed

              edgeMap.set(edgeId, {
                id: edgeId,
                source: result.parentId,
                target: nodeId,
                type: "smoothstep",
                animated: isLoading,
                style: {
                  stroke: edgeColor,
                  strokeWidth: isLoading ? 3 : 2,
                  strokeDasharray: isAxiom ? "5,5" : undefined,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: edgeColor,
                  width: 20,
                  height: 20,
                },
              });
            }
          }

          // Handle breakDownConcept tool calls to create edges
          if (tool.toolName === "breakDownConcept" && tool.state === "result") {
            const result = tool.result as BreakdownResult;
            const parentId = result.parentNodeId;

            // Create edges for each sub-concept
            result.subConcepts.forEach((subConcept) => {
              const edgeId = `edge-${parentId}-${subConcept.nodeId}`;
              const isAxiom = subConcept.isAxiom;

              let edgeColor = "#6b7280"; // default gray
              if (isAxiom) edgeColor = "#10b981"; // green for axioms
              else edgeColor = "#3b82f6"; // blue for concepts that need research

              edgeMap.set(edgeId, {
                id: edgeId,
                source: parentId,
                target: subConcept.nodeId,
                type: "smoothstep",
                animated: !isAxiom,
                style: {
                  stroke: edgeColor,
                  strokeWidth: 2,
                  strokeDasharray: isAxiom ? "5,5" : undefined,
                },
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  color: edgeColor,
                  width: 20,
                  height: 20,
                },
              });
            });
          }
        });
      }
    });

    const newNodes = Array.from(nodeMap.values());
    const newEdges = Array.from(edgeMap.values());

    if (newNodes.length > 0) {
      const { nodes: layoutedNodes, edges: layoutedEdges } =
        getLayoutedElements(newNodes, newEdges);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
      setTimeout(() => fitView(), 100);
    }
  }, [messages, setNodes, setEdges, fitView]);

  useEffect(() => {
    parseResearchData();
  }, [parseResearchData]);

  const startResearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!researchQuery.trim()) {
        toast.error("Please enter a research query");
        return;
      }

      setIsResearching(true);
      setNodes([]);
      setEdges([]);

      // Start the research process by sending the query as a message
      append({
        role: "user",
        content: `Please research this topic using tree graph thinking: ${researchQuery.trim()}`,
      });
    },
    [researchQuery, append, setNodes, setEdges]
  );

  const downloadReport = useCallback(() => {
    // Generate and download PDF report
    const reportData = {
      query: researchQuery,
      nodes: nodes.length,
      axioms: nodes.filter((n: ResearchNode) => n.data.isAxiom).length,
      completed: nodes.filter(
        (n: ResearchNode) => n.data.status === "completed"
      ).length,
      timestamp: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `research-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded!");
  }, [researchQuery, nodes]);

  const downloadKnowledge = useCallback(() => {
    // Generate and download .knowledge file
    const knowledgeData = nodes
      .filter((n: ResearchNode) => n.data.isAxiom)
      .map(
        (n: ResearchNode) =>
          `${n.data.concept}: ${n.data.researchData || "Fundamental axiom"}`
      )
      .join("\n\n");

    const blob = new Blob([knowledgeData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `knowledge-${Date.now()}.knowledge`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Knowledge file downloaded!");
  }, [nodes]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      setSelectedNode(node as ResearchNode);
      setIsModalOpen(true);
    },
    []
  );

  const stats = useMemo(() => {
    const totalNodes = nodes.length;
    const axioms = nodes.filter((n: ResearchNode) => n.data.isAxiom).length;
    const concepts = totalNodes - axioms;
    const idle = nodes.filter(
      (n: ResearchNode) => n.data.status === "idle"
    ).length;
    const loading = nodes.filter(
      (n: ResearchNode) => n.data.status === "loading"
    ).length;
    const completed = nodes.filter(
      (n: ResearchNode) => n.data.status === "completed"
    ).length;

    return { totalNodes, axioms, concepts, idle, loading, completed };
  }, [nodes]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Deep Research Agent</h1>
          </div>

          <div className="flex items-center gap-2">
            {stats.totalNodes > 0 && (
              <>
                <Badge variant="outline">Nodes: {stats.totalNodes}</Badge>
                <Badge variant="outline">Axioms: {stats.axioms}</Badge>
                <Badge variant="outline">Idle: {stats.idle}</Badge>
                <Badge variant="outline">Loading: {stats.loading}</Badge>
                <Badge variant="outline">Completed: {stats.completed}</Badge>
              </>
            )}
          </div>
        </div>

        {/* Research Input */}
        <form
          onSubmit={startResearch}
          className="flex gap-2 max-w-2xl mx-auto mt-4"
        >
          <Input
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            placeholder="Enter your research query (e.g., 'How does machine learning work?')"
            disabled={isResearching}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={isResearching || !researchQuery.trim()}
          >
            {isResearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            {isResearching ? "Researching..." : "Research"}
          </Button>
        </form>
      </div>

      {/* React Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={handleNodeClick}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />

          {/* Control Panel */}
          <Panel position="top-right" className="space-y-2">
            {nodes.length > 0 && (
              <>
                <Button
                  onClick={downloadReport}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
                <Button
                  onClick={downloadKnowledge}
                  variant="outline"
                  size="sm"
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Knowledge
                </Button>
              </>
            )}

            {isResearching && (
              <Button
                onClick={stop}
                variant="destructive"
                size="sm"
                className="w-full"
              >
                Stop Research
              </Button>
            )}
          </Panel>

          {/* Research Progress */}
          {isResearching && (
            <Panel position="bottom-center">
              <Card className="w-96">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">Research in Progress</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Building research tree using tree graph thinking...
                  </div>
                  {stats.totalNodes > 0 && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      Nodes: {stats.totalNodes} | Idle: {stats.idle} | Loading:{" "}
                      {stats.loading} | Completed: {stats.completed}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Panel>
          )}
        </ReactFlow>

        {/* Node Detail Modal */}
        {selectedNode && (
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span>{selectedNode.data.isAxiom ? "🎯" : "🔍"}</span>
                  {selectedNode.data.concept}
                </DialogTitle>
                <DialogDescription>
                  Research node details and information
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Status</h4>
                    <Badge
                      variant={
                        selectedNode.data.isAxiom ? "default" : "secondary"
                      }
                      className="text-xs"
                    >
                      {selectedNode.data.isAxiom
                        ? "Axiom"
                        : selectedNode.data.status}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-semibold text-sm mb-1">Depth</h4>
                    <Badge variant="outline" className="text-xs">
                      Level {selectedNode.data.depth}
                    </Badge>
                  </div>
                </div>

                {selectedNode.data.researchData && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">
                      Research Data
                    </h4>
                    <div className="bg-muted p-3 rounded-md text-sm">
                      {selectedNode.data.researchData}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-sm mb-2">
                    Node Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Node ID:</span>
                      <span className="font-mono text-xs">
                        {selectedNode.id}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span>
                        {selectedNode.data.isAxiom
                          ? "Fundamental Axiom"
                          : "Research Concept"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Processing Status:
                      </span>
                      <span className="capitalize">
                        {selectedNode.data.status}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedNode.data.isAxiom && (
                  <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-green-600" />
                      <span className="font-semibold text-sm text-green-800 dark:text-green-200">
                        Axiom Node
                      </span>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      This concept has been identified as a fundamental axiom
                      that does not require further breakdown.
                    </p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

// Main Page Component
export default function ResearchPage() {
  return (
    <ReactFlowProvider>
      <ResearchFlow />
    </ReactFlowProvider>
  );
}
