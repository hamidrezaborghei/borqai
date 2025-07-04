import { openai } from "@ai-sdk/openai";
import { streamText, tool, generateText } from "ai";
import { z } from "zod";
import { searchWeb } from "../tools/search-web";
import { extractWebContent } from "../tools/extract-web-content";
import { getCurrentDateTime } from "../tools/get-current-datetime";
import fs from "fs/promises";
import { createWriteStream } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

// Allow streaming responses up to 10 minutes for deep research
export const maxDuration = 600;

export function errorHandler(error: unknown) {
  if (error == null) {
    return "unknown error";
  }
  if (typeof error === "string") {
    return error;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return JSON.stringify(error);
}

// Types for research state management
interface ResearchState {
  query: string;
  depth: number;
  maxDepth: number;
  breadth: number;
  findings: ResearchFinding[];
  questions: string[];
  axioms: string[];
  sources: string[];
  completed: boolean;
}

interface ResearchFinding {
  id: string;
  query: string;
  content: string;
  source: string;
  depth: number;
  timestamp: Date;
  followUpQuestions: string[];
  isAxiom: boolean;
}

// Global research state (in production, use a database)
let researchState: ResearchState | null = null;

// Tool for managing research state
const manageResearchState = tool({
  description:
    "Manage the research state, track findings, and determine when axioms are reached",
  parameters: z.object({
    action: z.enum([
      "initialize",
      "addFinding",
      "addQuestions",
      "markAxiom",
      "checkCompletion",
    ]),
    data: z
      .object({
        query: z.string().nullable(),
        maxDepth: z.number().nullable(),
        breadth: z.number().nullable(),
        content: z.string().nullable(),
        source: z.string().nullable(),
        followUpQuestions: z.array(z.string()).nullable(),
        questions: z.array(z.string()).nullable(),
        axiom: z.string().nullable(),
      })
      .nullable(),
  }),
  execute: async ({ action, data }) => {
    switch (action) {
      case "initialize":
        if (!data?.query) return "Missing query for initialization";
        researchState = {
          query: data.query,
          depth: 0,
          maxDepth: data.maxDepth || 5,
          breadth: data.breadth || 3,
          findings: [],
          questions: [data.query],
          axioms: [],
          sources: [],
          completed: false,
        };
        return "Research state initialized";

      case "addFinding":
        if (!researchState) return "Research state not initialized";
        if (!data?.query || !data?.content || !data?.source) {
          return "Missing required fields for adding finding";
        }
        const finding: ResearchFinding = {
          id: `finding-${Date.now()}-${Math.random()
            .toString(36)
            .substr(2, 9)}`,
          query: data.query,
          content: data.content,
          source: data.source,
          depth: researchState.depth,
          timestamp: new Date(),
          followUpQuestions: data.followUpQuestions || [],
          isAxiom: false,
        };
        researchState.findings.push(finding);
        if (!researchState.sources.includes(data.source)) {
          researchState.sources.push(data.source);
        }
        return `Finding added: ${finding.id}`;

      case "addQuestions":
        if (!researchState) return "Research state not initialized";
        if (!data?.questions) return "Missing questions array";
        const newQuestions = data.questions.filter(
          (q: string) =>
            !researchState!.questions.includes(q) &&
            !researchState!.findings.some((f) => f.query === q)
        );
        researchState.questions.push(...newQuestions);
        return `Added ${newQuestions.length} new questions`;

      case "markAxiom":
        if (!researchState) return "Research state not initialized";
        if (!data?.axiom) return "Missing axiom text";
        const axiom = data.axiom;
        if (!researchState.axioms.includes(axiom)) {
          researchState.axioms.push(axiom);
        }
        // Mark related findings as axioms
        researchState.findings.forEach((f) => {
          if (
            f.content.includes(axiom) ||
            axiom.includes(f.content.substring(0, 100))
          ) {
            f.isAxiom = true;
          }
        });
        return `Axiom marked: ${axiom}`;

      case "checkCompletion":
        if (!researchState) return "Research state not initialized";
        const hasAxioms = researchState.axioms.length > 0;
        const reachedMaxDepth = researchState.depth >= researchState.maxDepth;
        const noMoreQuestions = researchState.questions.length === 0;
        const sufficientFindings = researchState.findings.length >= 10;

        researchState.completed =
          hasAxioms &&
          (reachedMaxDepth || noMoreQuestions || sufficientFindings);

        return {
          completed: researchState.completed,
          hasAxioms,
          reachedMaxDepth,
          noMoreQuestions,
          sufficientFindings,
          currentDepth: researchState.depth,
          maxDepth: researchState.maxDepth,
          findingsCount: researchState.findings.length,
          axiomsCount: researchState.axioms.length,
        };

      default:
        return "Unknown action";
    }
  },
});

// Tool for generating follow-up questions
const generateFollowUpQuestions = tool({
  description:
    "Generate intelligent follow-up questions based on research findings to dig deeper",
  parameters: z.object({
    content: z
      .string()
      .describe("The content to analyze for follow-up questions"),
    currentQuery: z.string().describe("The current research query"),
    depth: z.number().describe("Current research depth"),
  }),
  execute: async ({ content, currentQuery, depth }) => {
    // Use AI to generate intelligent follow-up questions
    const questionPrompt = `
Based on this research content about "${currentQuery}", generate 2-3 specific, deeper follow-up questions that would help reach fundamental axioms or principles.

Content: ${content.substring(0, 1000)}...

Focus on:
- Underlying principles and mechanisms
- Root causes and fundamental reasons
- Historical context and origins
- Scientific or logical foundations
- Contradictions or gaps that need clarification

Generate questions that go ${depth + 1} levels deeper than the current query.
Return only the questions, one per line.
`;

    try {
      const result = await generateText({
        model: openai.responses("o4-mini"),
        prompt: questionPrompt,
      });

      const questions = (result.text || "")
        .split("\n")
        .filter((q) => q.trim().length > 0 && q.includes("?"))
        .map((q) => q.replace(/^\d+\.\s*/, "").trim())
        .slice(0, 3);

      return questions;
    } catch {
      return [
        `What are the fundamental principles behind ${currentQuery}?`,
        `What historical factors led to ${currentQuery}?`,
        `What are the root causes of ${currentQuery}?`,
      ];
    }
  },
});

// Tool for identifying axioms
const identifyAxioms = tool({
  description:
    "Analyze research content to identify fundamental axioms, principles, or irreducible truths",
  parameters: z.object({
    content: z.string().describe("The research content to analyze"),
    query: z.string().describe("The research query context"),
  }),
  execute: async ({ content, query }) => {
    const axiomPrompt = `
Analyze this research content about "${query}" and identify any fundamental axioms, principles, or irreducible truths.

Content: ${content}

Look for:
- Basic scientific laws or principles
- Mathematical or logical foundations
- Fundamental definitions or concepts
- Universal truths or constants
- Irreducible explanations (things that cannot be explained by simpler concepts)

If you find axioms, list them clearly. If not, return "No axioms identified."
`;

    try {
      const result = await generateText({
        model: openai.responses("o4-mini"),
        prompt: axiomPrompt,
      });

      const axioms = (result.text || "")
        .split("\n")
        .filter(
          (line) =>
            line.trim().length > 0 && !line.toLowerCase().includes("no axioms")
        )
        .map((line) =>
          line
            .replace(/^\d+\.\s*/, "")
            .replace(/^-\s*/, "")
            .trim()
        )
        .filter((axiom) => axiom.length > 10);

      return axioms.length > 0 ? axioms : [];
    } catch {
      return [];
    }
  },
});

// Tool for saving knowledge file
const saveKnowledgeFile = tool({
  description:
    "Save all research findings to a .knowledge file for use by other agents",
  parameters: z.object({
    filename: z.string().describe("The filename for the knowledge file"),
  }),
  execute: async ({ filename }) => {
    if (!researchState) return "No research state to save";

    const knowledgeData = {
      metadata: {
        query: researchState.query,
        timestamp: new Date().toISOString(),
        totalFindings: researchState.findings.length,
        totalAxioms: researchState.axioms.length,
        totalSources: researchState.sources.length,
        maxDepth: researchState.maxDepth,
        completed: researchState.completed,
      },
      axioms: researchState.axioms,
      findings: researchState.findings,
      sources: researchState.sources,
      summary: `Deep research on "${researchState.query}" completed with ${researchState.findings.length} findings and ${researchState.axioms.length} axioms identified.`,
    };

    try {
      const knowledgeDir = path.join(process.cwd(), "knowledge");
      await fs.mkdir(knowledgeDir, { recursive: true });

      const filePath = path.join(knowledgeDir, `${filename}.knowledge`);
      await fs.writeFile(filePath, JSON.stringify(knowledgeData, null, 2));

      return `Knowledge file saved: ${filePath}`;
    } catch (error) {
      return `Error saving knowledge file: ${error}`;
    }
  },
});

// Tool for generating PDF report
const generatePDFReport = tool({
  description: "Generate a comprehensive PDF report of all research findings",
  parameters: z.object({
    filename: z.string().describe("The filename for the PDF report"),
  }),
  execute: async ({ filename }) => {
    if (!researchState) return "No research state to generate report";

    try {
      const reportsDir = path.join(process.cwd(), "reports");
      await fs.mkdir(reportsDir, { recursive: true });

      const filePath = path.join(reportsDir, `${filename}.pdf`);

      return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const stream = createWriteStream(filePath);
        doc.pipe(stream);

        // Title page
        doc.fontSize(24).text("Deep Research Report", { align: "center" });
        doc.moveDown();
        doc
          .fontSize(18)
          .text(`Query: ${researchState!.query}`, { align: "center" });
        doc.moveDown();
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, {
          align: "center",
        });
        doc.moveDown(2);

        // Executive Summary
        doc.fontSize(16).text("Executive Summary", { underline: true });
        doc.moveDown();
        doc
          .fontSize(12)
          .text(
            `This report presents the findings from a deep research investigation into "${
              researchState!.query
            }". The research process identified ${
              researchState!.findings.length
            } key findings across ${
              researchState!.sources.length
            } sources, ultimately discovering ${
              researchState!.axioms.length
            } fundamental axioms.`
          );
        doc.moveDown(2);

        // Axioms section
        if (researchState!.axioms.length > 0) {
          doc
            .fontSize(16)
            .text("Fundamental Axioms Discovered", { underline: true });
          doc.moveDown();
          researchState!.axioms.forEach((axiom, index) => {
            doc.fontSize(12).text(`${index + 1}. ${axiom}`);
            doc.moveDown();
          });
          doc.moveDown();
        }

        // Findings section
        doc.fontSize(16).text("Research Findings", { underline: true });
        doc.moveDown();

        researchState!.findings.forEach((finding, index) => {
          if (doc.y > 700) {
            doc.addPage();
          }

          doc
            .fontSize(14)
            .text(`Finding ${index + 1}${finding.isAxiom ? " (Axiom)" : ""}`, {
              underline: true,
            });
          doc.fontSize(10).text(`Query: ${finding.query}`);
          doc.text(`Source: ${finding.source}`);
          doc.text(
            `Depth: ${
              finding.depth
            } | Timestamp: ${finding.timestamp.toLocaleString()}`
          );
          doc.moveDown(0.5);
          doc
            .fontSize(12)
            .text(
              finding.content.substring(0, 500) +
                (finding.content.length > 500 ? "..." : "")
            );
          doc.moveDown();

          if (finding.followUpQuestions.length > 0) {
            doc.fontSize(10).text("Follow-up Questions:");
            finding.followUpQuestions.forEach((q) => {
              doc.text(`• ${q}`);
            });
          }
          doc.moveDown(1.5);
        });

        // Sources section
        doc.addPage();
        doc.fontSize(16).text("Sources", { underline: true });
        doc.moveDown();
        researchState!.sources.forEach((source, index) => {
          doc.fontSize(12).text(`${index + 1}. ${source}`);
          doc.moveDown(0.5);
        });

        doc.end();

        stream.on("finish", () => {
          resolve(`PDF report generated: ${filePath}`);
        });

        stream.on("error", (error: Error) => {
          reject(`Error generating PDF: ${error.message}`);
        });
      });
    } catch (error) {
      return `Error generating PDF report: ${error}`;
    }
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
      system: `You are an advanced autonomous deep research agent. Your mission is to conduct comprehensive research until you reach fundamental axioms or irreducible truths.

RESEARCH METHODOLOGY:
1. Start with the user's query and initialize research state
2. Use searchWeb to find relevant information
3. Use extractWebContent to get detailed content from promising sources
4. Analyze content to identify key findings and generate deeper follow-up questions
5. Continue researching follow-up questions recursively
6. Identify fundamental axioms - basic principles that cannot be reduced further
7. Stop when you've found axioms or reached sufficient depth
8. Save all knowledge to a .knowledge file
9. Generate a comprehensive PDF report

AXIOM IDENTIFICATION CRITERIA:
- Scientific laws (e.g., laws of physics, chemistry)
- Mathematical principles (e.g., axioms of geometry, number theory)
- Logical foundations (e.g., law of non-contradiction)
- Fundamental definitions that cannot be simplified
- Universal constants or principles
- Root causes that cannot be explained by simpler concepts

RESEARCH DEPTH STRATEGY:
- Start broad, then narrow down to specifics
- Always ask "why" and "how" to go deeper
- Look for contradictions or gaps that need clarification
- Seek primary sources and authoritative references
- Cross-reference findings across multiple sources

COMPLETION CRITERIA:
- Found at least one fundamental axiom
- Reached maximum research depth (5 levels)
- Exhausted meaningful follow-up questions
- Gathered sufficient evidence (10+ findings)

Remember: Your goal is not just to collect information, but to reach the bedrock of understanding - the fundamental truths that underlie the topic.`,
      messages,
      maxSteps: 50, // Allow many steps for deep research
      tools: {
        searchWeb,
        extractWebContent,
        getCurrentDateTime,
        manageResearchState,
        generateFollowUpQuestions,
        identifyAxioms,
        saveKnowledgeFile,
        generatePDFReport,
      },
      abortSignal: req.signal,
    });

    return result.toDataStreamResponse({
      getErrorMessage: errorHandler,
      sendReasoning: true,
    });
  } catch (error) {
    console.error("Research API error:", error);
    return new Response(errorHandler(error), { status: 500 });
  }
}
