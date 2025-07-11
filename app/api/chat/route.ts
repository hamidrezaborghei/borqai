import { openai } from "@ai-sdk/openai";
import { stepCountIs, streamText, convertToModelMessages } from "ai";
import { chatTools } from "../tools";

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
  try {
    const { messages } = await req.json();

    // Validate messages
    if (!Array.isArray(messages)) {
      return new Response("Invalid messages format", { status: 400 });
    }

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
         - Always ensure you have the current time and date context when responding to time-sensitive queries or when temporal context is relevant to the user's request.
         
         Current Date and Time: ${new Date().toISOString()}
         `,
      messages: convertToModelMessages(messages),
      stopWhen: stepCountIs(100),
      tools: chatTools,
      abortSignal: req.signal, // Add abort signal for proper cancellation
    });

    return result.toUIMessageStreamResponse({
      onError: errorHandler,
      sendSources: true,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(errorHandler(error), { status: 500 });
  }
}
