import { z } from "zod";
import { experimental_createMCPClient } from "ai";

// Create MCP client for Context7
async function createContext7Client() {
  const client = await experimental_createMCPClient({
    transport: {
      type: "sse",
      url: "https://mcp.context7.com/sse",
    },
    onUncaughtError: (error) => {
      console.error("MCP Client uncaught error:", error);
    },
  });

  return client;
}

export const getDocumentationTools = async () => {
  const client = await createContext7Client();
  const tools = await client.tools({
    schemas: {
      "resolve-library-id": {
        inputSchema: z.object({
          libraryName: z
            .string()
            .describe(
              "Library name to search for and retrieve a Context7-compatible library ID."
            ),
        }),
      },
      "get-library-docs": {
        inputSchema: z.object({
          context7CompatibleLibraryID: z
            .string()
            .describe(
              "Exact Context7-compatible library ID (e.g., '/mongodb/docs', '/vercel/next.js', '/supabase/supabase') retrieved from 'resolve-library-id' or directly from user query in the format '/org/project' or '/org/project/version'."
            ),
          topic: z
            .union([z.string().refine(() => true), z.null()])
            .describe(
              "Topic to focus documentation on (e.g., 'hooks', 'routing')."
            ),
          tokens: z
            .union([z.number().refine(() => true), z.null()])
            .describe(
              "Maximum number of tokens of documentation to retrieve (default: 10000). Higher values provide more context but consume more tokens."
            ),
        }),
      },
    },
  });

  return tools;
};
