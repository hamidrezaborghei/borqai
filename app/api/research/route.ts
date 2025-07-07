import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";
import { researchTools } from "../tools";

// Allow streaming responses up to 60 seconds for research
export const maxDuration = 60;

// Tool for managing research tree state with proper status tracking
const updateResearchTree = tool({
  description:
    "Update the research tree with new nodes and their research status",
  parameters: z.object({
    nodeId: z.string().describe("Unique identifier for the node"),
    concept: z.string().describe("The concept this node represents"),
    parentId: z
      .union([z.string().refine(() => true), z.null()])
      .describe("Parent node ID if this is a child node"),
    depth: z.number().describe("Depth level in the tree"),
    status: z
      .enum(["idle", "loading", "completed"])
      .describe(
        "Node status: idle (not started), loading (researching), completed (done or all children are axioms)"
      ),
    isAxiom: z.boolean().describe("Whether this concept is an axiom"),
    researchData: z
      .union([z.string().refine(() => true), z.null()])
      .describe("Research findings for this concept"),
  }),
  execute: async ({
    nodeId,
    concept,
    parentId,
    depth,
    status,
    isAxiom,
    researchData,
  }) => {
    return {
      nodeId,
      concept,
      parentId,
      depth,
      status,
      isAxiom,
      researchData,
      message: `Updated tree node ${nodeId} for concept "${concept}" at depth ${depth} with status ${status}`,
    };
  },
});

// Tool for conducting research on a specific concept
const researchConcept = tool({
  description: "Research a specific concept thoroughly using web search",
  parameters: z.object({
    nodeId: z.string().describe("The node ID being researched"),
    concept: z.string().describe("The concept to research"),
    searchQueries: z
      .array(z.string())
      .describe("Specific search queries to gather comprehensive information"),
  }),
  execute: async ({ nodeId, concept, searchQueries }) => {
    return {
      nodeId,
      concept,
      searchQueries,
      status:
        "Research queries prepared - use searchWeb tool to execute these queries",
    };
  },
});

// Tool for breaking down concepts into smaller parts AFTER research
const breakDownConcept = tool({
  description:
    "Break down a researched concept into smaller concepts or axioms based on research findings",
  parameters: z.object({
    parentNodeId: z.string().describe("The parent node ID being broken down"),
    concept: z.string().describe("The concept to break down"),
    researchSummary: z
      .string()
      .describe("Summary of research findings about this concept"),
    subConcepts: z
      .array(
        z.object({
          nodeId: z.string().describe("Unique ID for the child node"),
          concept: z.string().describe("A smaller, more specific concept"),
          isAxiom: z
            .boolean()
            .describe(
              "Whether this is a fundamental axiom that doesn't need further breakdown"
            ),
          reasoning: z
            .string()
            .describe(
              "Why this concept is or isn't an axiom based on research"
            ),
        })
      )
      .describe("Array of sub-concepts derived from the main concept"),
  }),
  execute: async ({ parentNodeId, concept, researchSummary, subConcepts }) => {
    return {
      parentNodeId,
      concept,
      researchSummary,
      subConcepts,
      breakdown: `Successfully broke down "${concept}" into ${subConcepts.length} sub-concepts based on research`,
    };
  },
});

// Tool for determining if a concept is an axiom based on research
const evaluateAxiom = tool({
  description:
    "Evaluate whether a concept is a fundamental axiom based on research findings",
  parameters: z.object({
    nodeId: z.string().describe("The node ID being evaluated"),
    concept: z.string().describe("The concept to evaluate"),
    researchFindings: z
      .string()
      .describe("Research findings about this concept"),
    isAxiom: z
      .boolean()
      .describe("Whether this concept is a fundamental axiom"),
    reasoning: z
      .string()
      .describe(
        "Detailed reasoning for the axiom determination based on research"
      ),
    confidence: z
      .number()
      .min(0)
      .max(1)
      .describe("Confidence level in the axiom determination"),
  }),
  execute: async ({
    nodeId,
    concept,
    researchFindings,
    isAxiom,
    reasoning,
    confidence,
  }) => {
    return {
      nodeId,
      concept,
      researchFindings,
      isAxiom,
      reasoning,
      confidence,
      evaluation: `Evaluated "${concept}" as ${
        isAxiom ? "an axiom" : "requiring further breakdown"
      } with ${Math.round(confidence * 100)}% confidence`,
    };
  },
});

// Tool for generating final research report
const generateReport = tool({
  description: "Generate a comprehensive research report and knowledge file",
  parameters: z.object({
    title: z.string().describe("Title of the research"),
    summary: z.string().describe("Executive summary of the research"),
    keyFindings: z.array(z.string()).describe("Key findings from the research"),
    methodology: z.string().describe("Research methodology used"),
    conclusions: z
      .string()
      .describe("Main conclusions drawn from the research"),
    totalNodes: z
      .number()
      .describe("Total number of nodes in the research tree"),
    axiomNodes: z.number().describe("Number of axiom nodes identified"),
    researchDepth: z.number().describe("Maximum depth reached in the tree"),
  }),
  execute: async ({
    title,
    summary,
    keyFindings,
    methodology,
    conclusions,
    totalNodes,
    axiomNodes,
    researchDepth,
  }) => {
    return {
      title,
      summary,
      keyFindings,
      methodology,
      conclusions,
      totalNodes,
      axiomNodes,
      researchDepth,
      status: "Comprehensive research report generated",
    };
  },
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const result = streamText({
      model: openai(process.env.OPENAI_MODEL || "gpt-4o"),
      system: `You are a deep research agent that implements tree graph thinking for comprehensive research.

CRITICAL RESEARCH METHODOLOGY - FOLLOW THIS EXACT PROCESS:

**TREE STRUCTURE REQUIREMENTS:**
- Create a proper tree structure from root to leaves (top to bottom)
- Each node has exactly ONE parent (except root)
- Each edge connects parent to child
- Use updateResearchTree tool to track ALL nodes and their relationships

**NODE STATUS SYSTEM (3 states only):**
- "idle": Node exists but research hasn't started yet
- "loading": Currently researching this node (web search in progress)
- "completed": Research finished AND (node is axiom OR all children are completed/axioms)

**STEP-BY-STEP PROCESS:**

1. **Initialize Root Node**
   - Use updateResearchTree to create root node with status "idle"
   - Set depth 0, no parent

2. **Research Phase for Each Node**
   - Change status to "loading" using updateResearchTree
   - Use researchConcept to plan search queries
   - Use searchWeb and extractWebContent to gather information
   - Use evaluateAxiom to determine if it's an axiom

3. **Breakdown Phase (if not axiom)**
   - Use breakDownConcept to create child concepts
   - Use updateResearchTree to create each child node with status "idle"
   - Create proper parent-child relationships with parentId

4. **Recursive Processing**
   - For each child node with status "idle", repeat steps 2-3
   - Continue until ALL leaf nodes are axioms

5. **Status Updates**
   - Mark node as "completed" when: (isAxiom=true) OR (all children are completed)
   - Update parent nodes to "completed" when all their children are completed

**TREE BUILDING RULES:**
- Root node: depth 0, no parentId
- Child nodes: depth = parent.depth + 1, parentId = parent.nodeId
- Node IDs: use format "node_0", "node_1", "node_2", etc.
- Always create edges by setting parentId in updateResearchTree

**AXIOM DETERMINATION CRITERIA (EXTREMELY STRICT):**
A concept is an axiom ONLY if it meets ALL of these criteria:
- It is a fundamental mathematical/physical law, basic data type, or elementary operation (e.g., "addition", "pixel", "RGB color", "byte")
- It cannot be meaningfully decomposed into simpler technical concepts or sub-processes
- It is universally accepted and standardized across the field with no variations
- It represents the most basic building block that other concepts depend on
- It has NO implementation variations, algorithms, or methods associated with it
- It is atomic in nature - cannot be broken down further without losing meaning

**STRICT AXIOM EXAMPLES (very limited set):**
- "Pixel" (basic unit of digital images - cannot be decomposed further)
- "Bit" (fundamental unit of information)
- "Addition" (basic mathematical operation)
- "RGB color model" (fundamental color representation)
- "HTTP request" (basic web communication unit)
- "Matrix" (mathematical data structure)

**DEFINITELY NOT AXIOMS (must be researched and broken down):**
- "Quantization" → Break down into: quantization methods, uniform vs non-uniform, scalar vs vector, rate-distortion trade-offs
- "Garment warping" → Break down into: warping algorithms, mesh deformation, texture mapping, geometric transformations
- "Segmentation" → Break down into: segmentation methods, thresholding, region growing, edge detection
- "Neural networks" → Break down into: layers, activations, training methods, architectures
- "Machine learning" → Break down into: supervised/unsupervised learning, algorithms, optimization
- "Computer vision" → Break down into: image processing, feature extraction, pattern recognition
- "Deep learning" → Break down into: neural architectures, backpropagation, gradient descent
- "Image processing" → Break down into: filtering, enhancement, transformation, analysis
- "Optimization" → Break down into: optimization algorithms, objective functions, constraints
- "Algorithm" → Break down into: specific algorithm types, complexity, implementation

**RESEARCH REQUIREMENT:**
- If a concept has multiple implementation approaches, it's NOT an axiom
- If a concept has sub-categories or variations, it's NOT an axiom
- If a concept requires explanation of "how it works", it's NOT an axiom
- If a concept can be implemented differently, it's NOT an axiom
- When in doubt, it's NOT an axiom - always err on the side of further breakdown

**RESEARCH REQUIREMENTS:**
- Research EVERY concept thoroughly before determining if it's an axiom
- Use multiple search queries per concept (3-5 different angles)
- Extract content from authoritative sources
- Be CONSERVATIVE: when in doubt, it's NOT an axiom - break it down further
- Only mark as axiom if it truly cannot be decomposed into meaningful sub-concepts

**COMPLETION CRITERIA:**
- Research is complete when root node status = "completed"
- This happens when all leaf nodes are axioms
- Generate final report only when tree is complete

IMPORTANT: Always use updateResearchTree to track the tree structure. The frontend depends on these tool calls to build the visual tree.`,
      messages,
      maxSteps: 100,
      tools: {
        updateResearchTree,
        researchConcept,
        breakDownConcept,
        evaluateAxiom,
        generateReport,
        ...researchTools,
      },
      abortSignal: req.signal,
    });

    return result.toDataStreamResponse({
      sendReasoning: true,
    });
  } catch (error) {
    console.error("Research API error:", error);
    return new Response(
      error instanceof Error ? error.message : "Unknown error occurred",
      { status: 500 }
    );
  }
}
