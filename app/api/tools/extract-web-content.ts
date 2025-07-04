import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const extractWebContent = tool({
  description:
    "Extract detailed content from specific web pages or URLs for in-depth analysis. Use this tool when you need more detailed information from specific URLs, often after getting initial results from searchWeb.",
  parameters: z.object({
    urls: z.array(z.string()).describe("Array of URLs to extract content from"),
    includeImages: z
      .boolean()
      .nullable()
      .describe(
        "Include a list of images extracted from the URLs in the response"
      ),
    extractDepth: z
      .enum(["basic", "advanced"])
      .nullable()
      .describe(
        "Extraction depth - basic (1 credit per 5 URLs) or advanced (2 credits per 5 URLs)"
      ),
    format: z
      .enum(["markdown", "text"])
      .nullable()
      .describe("Output format - markdown or text"),
  }),
  execute: async ({
    urls,
    includeImages,
    extractDepth = "basic",
    format = "markdown",
  }) => {
    try {
      // Check if TAVILY_API_KEY is available
      if (!process.env.TAVILY_API_KEY) {
        return `Content extraction is not available. Please set TAVILY_API_KEY environment variable to enable content extraction functionality.`;
      }

      // Initialize Tavily client and perform extraction using the SDK
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

      // Build extract options object
      const extractOptions: Record<string, unknown> = {
        format,
        extract_depth: extractDepth,
      };

      // Add optional parameters if provided
      if (includeImages !== undefined)
        extractOptions.include_images = includeImages;

      const extractedContent = await tvly.extract(urls, extractOptions);

      // Format the extracted content
      const formattedContent =
        extractedContent.results
          ?.map(
            (result: { url: string; raw_content?: string; content?: string }) =>
              `## Content from ${result.url}\n\n${
                result.raw_content || result.content || "No content extracted"
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
});
