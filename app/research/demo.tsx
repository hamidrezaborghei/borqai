"use client";

import React, { useState, useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  Panel,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import dagre from "@dagrejs/dagre";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Download, FileText } from "lucide-react";

// Demo data for machine learning research tree
const demoData = {
  "machine learning": {
    concept: "Machine Learning",
    isAxiom: false,
    children: [
      "supervised learning",
      "unsupervised learning",
      "neural networks",
      "data preprocessing",
    ],
  },
  "supervised learning": {
    concept: "Supervised Learning",
    isAxiom: false,
    children: ["linear regression", "decision trees", "classification"],
  },
  "unsupervised learning": {
    concept: "Unsupervised Learning",
    isAxiom: false,
    children: ["clustering", "dimensionality reduction"],
  },
  "neural networks": {
    concept: "Neural Networks",
    isAxiom: false,
    children: ["perceptron", "backpropagation", "activation functions"],
  },
  "data preprocessing": {
    concept: "Data Preprocessing",
    isAxiom: false,
    children: ["normalization", "feature selection", "data cleaning"],
  },
  "linear regression": {
    concept: "Linear Regression",
    isAxiom: true,
    children: [],
  },
  "decision trees": {
    concept: "Decision Trees",
    isAxiom: true,
    children: [],
  },
  classification: {
    concept: "Classification",
    isAxiom: true,
    children: [],
  },
  clustering: {
    concept: "Clustering",
    isAxiom: true,
    children: [],
  },
  "dimensionality reduction": {
    concept: "Dimensionality Reduction",
    isAxiom: true,
    children: [],
  },
  perceptron: {
    concept: "Perceptron",
    isAxiom: true,
    children: [],
  },
  backpropagation: {
    concept: "Backpropagation",
    isAxiom: true,
    children: [],
  },
  "activation functions": {
    concept: "Activation Functions",
    isAxiom: true,
    children: [],
  },
  normalization: {
    concept: "Normalization",
    isAxiom: true,
    children: [],
  },
  "feature selection": {
    concept: "Feature Selection",
    isAxiom: true,
    children: [],
  },
  "data cleaning": {
    concept: "Data Cleaning",
    isAxiom: true,
    children: [],
  },
};

// Custom Research Node Component
function ResearchNode({ data, selected }: any) {
  const getNodeColor = (isAxiom: boolean) => {
    if (isAxiom)
      return "bg-green-100 border-green-300 dark:bg-green-900/20 dark:border-green-700";
    return "bg-blue-100 border-blue-300 dark:bg-blue-900/20 dark:border-blue-700";
  };

  const getStatusIcon = (isAxiom: boolean) => {
    return isAxiom ? "🎯" : "🔍";
  };

  return (
    <Card
      className={`min-w-[180px] max-w-[250px] ${getNodeColor(data.isAxiom)} ${
        selected ? "ring-2 ring-blue-500" : ""
      }`}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <span>{getStatusIcon(data.isAxiom)}</span>
          <span className="truncate">{data.concept}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex flex-wrap gap-1">
          <Badge
            variant={data.isAxiom ? "default" : "secondary"}
            className="text-xs"
          >
            {data.isAxiom ? "Axiom" : "Concept"}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Depth: {data.depth}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

const nodeTypes = {
  researchNode: ResearchNode,
};

// Layout function using Dagre
const getLayoutedElements = (nodes: any[], edges: any[]) => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: "TB", nodesep: 80, ranksep: 120 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 200, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: Position.Top,
      sourcePosition: Position.Bottom,
      position: {
        x: nodeWithPosition.x - 100,
        y: nodeWithPosition.y - 50,
      },
    };
  });

  return { nodes: newNodes, edges };
};

// Build tree from demo data
function buildTreeFromData(rootKey: string, data: any) {
  const nodes: any[] = [];
  const edges: any[] = [];
  const visited = new Set();

  function traverse(key: string, depth = 0) {
    if (visited.has(key) || !data[key]) return;

    visited.add(key);
    const item = data[key];

    nodes.push({
      id: key,
      type: "researchNode",
      position: { x: 0, y: 0 },
      data: {
        concept: item.concept,
        isAxiom: item.isAxiom,
        depth: depth,
      },
    });

    item.children.forEach((childKey: string) => {
      edges.push({
        id: `${key}-${childKey}`,
        source: key,
        target: childKey,
        type: "smoothstep",
        animated: !data[childKey]?.isAxiom,
      });

      traverse(childKey, depth + 1);
    });
  }

  traverse(rootKey);
  return { nodes, edges };
}

function ResearchDemo() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [query, setQuery] = useState("machine learning");

  const generateTree = useCallback(() => {
    const { nodes: treeNodes, edges: treeEdges } = buildTreeFromData(
      "machine learning",
      demoData
    );
    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
      treeNodes,
      treeEdges
    );

    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [setNodes, setEdges]);

  const downloadDemo = useCallback(() => {
    const axioms = nodes.filter((n: any) => n.data.isAxiom);
    const knowledge = axioms
      .map(
        (n: any) => `${n.data.concept}: Fundamental concept in machine learning`
      )
      .join("\n\n");

    const blob = new Blob([knowledge], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ml-knowledge-demo.knowledge";
    a.click();
    URL.revokeObjectURL(url);
  }, [nodes]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Deep Research Agent - Demo</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline">Demo Mode</Badge>
            {nodes.length > 0 && (
              <>
                <Badge variant="outline">Nodes: {nodes.length}</Badge>
                <Badge variant="outline">
                  Axioms: {nodes.filter((n: any) => n.data.isAxiom).length}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-2 max-w-2xl mx-auto mt-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research topic (demo: machine learning)"
            className="flex-1"
            disabled
          />
          <Button onClick={generateTree}>Generate Tree</Button>
        </div>
      </div>

      {/* React Flow */}
      <div className="flex-1 relative">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
        >
          <Background />
          <Controls />
          <MiniMap />

          <Panel position="top-right" className="space-y-2">
            {nodes.length > 0 && (
              <Button
                onClick={downloadDemo}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Demo Knowledge
              </Button>
            )}
          </Panel>

          {nodes.length === 0 && (
            <Panel position="bottom-center">
              <Card className="w-96">
                <CardContent className="p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Click "Generate Tree" to see a demo of tree graph thinking
                    for machine learning research
                  </div>
                </CardContent>
              </Card>
            </Panel>
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export default function DemoPage() {
  return (
    <ReactFlowProvider>
      <ResearchDemo />
    </ReactFlowProvider>
  );
}
