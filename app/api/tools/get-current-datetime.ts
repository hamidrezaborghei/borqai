import { tool, zodSchema } from "ai";
import { z } from "zod";

export const getCurrentDateTime = tool({
  description:
    "Get the current date and time. Use this when the user asks for the current time, date, or wants to know what time it is now.",
  parameters: zodSchema(
    z.object({
      timezone: z
        .union([z.string().refine(() => true), z.null()])
        .describe(
          "Optional timezone (e.g., 'America/New_York', 'Europe/London'). If not provided, uses local server time."
        ),
      format: z
        .union([
          z.enum(["full", "date", "time", "iso"]).refine(() => true),
          z.null(),
        ])
        .describe(
          "Output format: 'full' (date and time), 'date' (date only), 'time' (time only), 'iso' (ISO string). Default: 'full'"
        ),
    })
  ),
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
});
