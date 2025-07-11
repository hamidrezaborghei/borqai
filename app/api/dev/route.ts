import { openai } from "@ai-sdk/openai";
import { streamText, Output, stepCountIs, convertToModelMessages } from "ai";
import { devTools } from "../tools";
import { z } from "zod";

// Allow streaming responses up to 60 seconds for more complex generations
export const maxDuration = 60;

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

// Structured output schema for website code
const WebsiteSchema = z.object({
  html: z.string().describe("Whole HTML code"),
});

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

    const result = streamText({
      model: openai.responses(process.env.OPENAI_MODEL || "gpt-4o"),
      system: `You are an advanced autonomous agent tasked with implementing the user's prompt as a complete HTML file.
Follow this workflow step by step:
1. First, search for how to implement the user's prompt using the Tavily search tool. Analyze the search results to understand the best approach.
2. If any web pages are relevant or needed, use the Tavily extract tool to extract their content for reference.
3. Next, use the Context7 tools to read the latest documentation relevant to the user's prompt, libraries, or technologies involved.
4. Only after you have gathered and read all the information you need, proceed to implement the solution.
5. Return the entire implementation as a single HTML file, including all required HTML, CSS (in a style tag in the head), and JavaScript (in a script tag in the body). The file must be self-contained and runnable as-is. Only use CDN links in the head for any external libraries. Do not use frameworks like React, Vue, or Angular.

IMPORTANT RESPONSIVE DESIGN REQUIREMENTS:
- ALWAYS make the web page fully responsive and mobile-friendly
- Use CSS media queries to ensure proper display on all screen sizes (mobile, tablet, desktop)
- Implement mobile-first design approach with appropriate breakpoints
- Use flexible layouts with CSS Grid, Flexbox, or responsive units (rem, em, %, vw, vh)
- Ensure touch-friendly interface elements with appropriate sizing for mobile devices
- Test responsiveness across different viewport sizes (320px mobile to 1920px+ desktop)
- Use responsive typography that scales appropriately
- Implement responsive images and media that adapt to screen size
- Ensure proper spacing and padding that works on all devices
- Make navigation and interactive elements accessible on touch devices

6. Your response must be the complete HTML code in a structured format, with no extra commentary or explanation.

Current Date and Time: ${new Date().toISOString()}
`,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(100),
      tools: devTools,
      abortSignal: req.signal, // Add abort signal for proper cancellation
      experimental_output: Output.object({
        schema: WebsiteSchema,
      }),
    });

    return result.toUIMessageStreamResponse({
      onError: errorHandler,
      sendSources: true,
    });
  } catch (error) {
    console.error("Dev API error:", error);
    return new Response(errorHandler(error), { status: 500 });
  }
}
