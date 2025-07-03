import { openai } from "@ai-sdk/openai";
import { streamText, tool } from "ai";
import { z } from "zod";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;
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
export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai.responses(process.env.OPENAI_MODEL || "gpt-4o"),
    system: `You are a helpful AI assistant.
       You can search the web and extract information when needed to provide accurate and up-to-date responses.
       Use the search tools when you need current information or when the user asks about recent events, news, or topics that require up-to-date information.
       You can call multiple tools in sequence if needed - for example, search for information first, then extract detailed content from specific URLs if more detail is needed.

       KNOWLEDGE UPDATE POLICY:
       - If, based on the current time, your knowledge may be outdated or insufficient to answer the user's question accurately, you MUST use the searchWeb and extractWebContent tools to update your knowledge before answering. Always check if your knowledge is current enough for the user's request, and if not, update it using these tools before providing a response.

       IMPORTANT TIME AND DATE HANDLING:
       - If the user has not defined any specific time or date in their request, always prioritize using the current date and time.
         Use the getCurrentDateTime tool to get the current time and date for any time-sensitive operations or responses.
       - If the user has explicitly defined a specific time or date in their prompt, use that specified time or date for your response.
       - If time or date context is needed but not explicitly defined by the user, always default to using the current date and time by calling the getCurrentDateTime tool.
       - Always ensure you have the current time and date context when responding to time-sensitive queries or when temporal context is relevant to the user's request.`,
    messages,
    maxSteps: 100, // Allow up to 5 tool calls in sequence

    tools: {
      searchWeb: tool({
        description:
          "Search the web for current information, news, or any topic you need to research. Use this when you need up-to-date information. After getting search results, you can use extractWebContent to get more detailed information from specific URLs if needed.",
        parameters: z.object({
          query: z
            .string()
            .describe("The search query to find relevant information"),
          maxResults: z
            .number()

            .describe("Maximum number of search results"),
          searchDepth: z
            .enum(["basic", "advanced"])

            .describe("Search depth - basic or advanced"),
        }),
        execute: async ({ query, maxResults = 5, searchDepth = "basic" }) => {
          try {
            // Check if TAVILY_API_KEY is available
            if (!process.env.TAVILY_API_KEY) {
              return `Web search is not available. Please set TAVILY_API_KEY environment variable to enable web search functionality.`;
            }

            // Make a direct API call to Tavily
            const response = await fetch("https://api.tavily.com/search", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
              },
              body: JSON.stringify({
                query,
                max_results: maxResults,
                search_depth: searchDepth,
                include_answer: true,
                include_raw_content: false,
              }),
            });

            if (!response.ok) {
              return `Search failed: ${response.statusText}`;
            }

            const searchResults = await response.json();

            // Format the results for better readability
            const formattedResults =
              searchResults.results
                ?.map(
                  (
                    result: { title: string; url: string; content: string },
                    index: number
                  ) =>
                    `${index + 1}. **${result.title}**\n   URL: ${
                      result.url
                    }\n   ${result.content}\n`
                )
                .join("\n") || "No results found.";

            return `Search Results for "${query}":\n\n${formattedResults}\n\nNote: If you need more detailed information from any of these sources, you can use the extractWebContent tool with the specific URLs.`;
          } catch (error) {
            return `Search error: ${
              error instanceof Error ? error.message : "Unknown error occurred"
            }`;
          }
        },
      }),
      extractWebContent: tool({
        description:
          "Extract detailed content from specific web pages or URLs for in-depth analysis. Use this tool when you need more detailed information from specific URLs, often after getting initial results from searchWeb.",
        parameters: z.object({
          urls: z
            .array(z.string())
            .describe("Array of URLs to extract content from"),
          format: z
            .enum(["markdown", "text"])

            .describe("Output format"),
        }),
        execute: async ({ urls, format = "markdown" }) => {
          try {
            // Check if TAVILY_API_KEY is available
            if (!process.env.TAVILY_API_KEY) {
              return `Content extraction is not available. Please set TAVILY_API_KEY environment variable to enable content extraction functionality.`;
            }

            // Make a direct API call to Tavily Extract
            const response = await fetch("https://api.tavily.com/extract", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${process.env.TAVILY_API_KEY}`,
              },
              body: JSON.stringify({
                urls,
                format,
              }),
            });

            if (!response.ok) {
              return `Content extraction failed: ${response.statusText}`;
            }

            const extractedContent = await response.json();

            // Format the extracted content
            const formattedContent =
              extractedContent.results
                ?.map(
                  (result: {
                    url: string;
                    raw_content?: string;
                    content?: string;
                  }) =>
                    `## Content from ${result.url}\n\n${
                      result.raw_content ||
                      result.content ||
                      "No content extracted"
                    }\n\n---\n`
                )
                .join("\n") || "No content could be extracted.";

            return `Extracted Content:\n\n${formattedContent}`;
          } catch (error) {
            return `Extraction error: ${
              error instanceof Error ? error.message : "Unknown error occurred"
            }`;
          }
        },
      }),
      getCurrentDateTime: tool({
        description:
          "Get the current date and time. Use this when the user asks for the current time, date, or wants to know what time it is now.",
        parameters: z.object({
          timezone: z
            .string()

            .describe(
              "Optional timezone (e.g., 'America/New_York', 'Europe/London'). If not provided, uses local server time."
            ),
          format: z
            .enum(["full", "date", "time", "iso"])

            .describe(
              "Output format: 'full' (date and time), 'date' (date only), 'time' (time only), 'iso' (ISO string). Default: 'full'"
            ),
        }),
        execute: async ({ timezone, format = "full" }) => {
          try {
            const now = new Date();

            let dateTime: Date;
            let timezoneInfo = "";

            if (timezone) {
              // Create date in specified timezone
              dateTime = new Date(
                now.toLocaleString("en-US", { timeZone: timezone })
              );
              timezoneInfo = ` (${timezone})`;
            } else {
              dateTime = now;
              timezoneInfo = " (server local time)";
            }

            switch (format) {
              case "date":
                return `Current date: ${dateTime.toLocaleDateString()}${timezoneInfo}`;
              case "time":
                return `Current time: ${dateTime.toLocaleTimeString()}${timezoneInfo}`;
              case "iso":
                return `Current date and time (ISO): ${now.toISOString()}`;
              case "full":
              default:
                return `Current date and time: ${dateTime.toLocaleDateString()} ${dateTime.toLocaleTimeString()}${timezoneInfo}`;
            }
          } catch (error) {
            return `Error getting current date/time: ${
              error instanceof Error ? error.message : "Unknown error occurred"
            }`;
          }
        },
      }),
    },
  });

  return result.toDataStreamResponse({
    getErrorMessage: errorHandler,
    sendReasoning: true,
  });
}
