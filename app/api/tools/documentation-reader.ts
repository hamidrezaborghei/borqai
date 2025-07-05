import { tool, zodSchema } from "ai";
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

// Tool to resolve library name to Context7-compatible library ID
export const resolveLibraryId = tool({
  description:
    "Resolves a package/product name to a Context7-compatible library ID and returns a list of matching libraries.",
  parameters: zodSchema(
    z.object({
      libraryName: z
        .string()
        .describe(
          "Library name to search for and retrieve a Context7-compatible library ID."
        ),
    })
  ),
  execute: async ({ libraryName }) => {
    let client;
    try {
      client = await createContext7Client();
      const tools = await client.tools();
      const resolveLibraryTool = tools["resolve-library-id"];

      if (!resolveLibraryTool) {
        throw new Error("resolve-library-id tool not found");
      }

      const result = await resolveLibraryTool.execute(
        { libraryName },
        {
          toolCallId: "resolve-library-id",
          messages: [],
        }
      );

      return result;
    } catch (error) {
      console.error("Error in resolveLibraryId:", error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});

// Tool to get library documentation
export const getLibraryDocs = tool({
  description:
    "Fetches up-to-date documentation for a library. You must call 'resolve-library-id' first to obtain the exact Context7-compatible library ID required to use this tool.",
  parameters: zodSchema(
    z.object({
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
    })
  ),
  execute: async ({ context7CompatibleLibraryID, topic, tokens }) => {
    let client;
    try {
      client = await createContext7Client();
      const tools = await client.tools();
      const getLibraryDocsTool = tools["get-library-docs"];

      if (!getLibraryDocsTool) {
        throw new Error("get-library-docs tool not found");
      }

      // Build parameters object, only including non-null values
      const params: {
        context7CompatibleLibraryID: string;
        topic?: string;
        tokens?: number;
      } = { context7CompatibleLibraryID };
      if (topic !== null) params.topic = topic;
      if (tokens !== null) params.tokens = tokens;

      const result = await getLibraryDocsTool.execute(params, {
        toolCallId: "get-library-docs",
        messages: [],
      });

      return result;
    } catch (error) {
      console.error("Error in getLibraryDocs:", error);
      throw error;
    } finally {
      if (client) {
        await client.close();
      }
    }
  },
});
