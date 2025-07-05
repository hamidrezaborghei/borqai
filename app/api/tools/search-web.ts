import { tool, zodSchema } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";

export const searchWeb = tool({
  description:
    "Search the web for current information, news, or any topic you need to research. Use this when you need up-to-date information. After getting search results, you can use extractWebContent to get more detailed information from specific URLs if needed.",
  parameters: zodSchema(
    z.object({
      query: z
        .string()
        .describe("The search query to find relevant information"),
      autoParameters: z
        .union([z.boolean().refine(() => true), z.null()])
        .describe(
          "When enabled, Tavily automatically configures search parameters based on your query's content and intent"
        ),
      topic: z
        .union([z.enum(["general", "news"]).refine(() => true), z.null()])
        .describe(
          "The category of the search. 'news' is useful for retrieving real-time updates, 'general' is for broader searches"
        ),
      searchDepth: z
        .union([z.enum(["basic", "advanced"]).refine(() => true), z.null()])
        .describe("Search depth - basic (1 credit) or advanced (2 credits)"),
      chunksPerSource: z
        .union([
          z
            .number()
            .min(1)
            .max(3)
            .refine(() => true),
          z.null(),
        ])
        .describe(
          "Maximum number of relevant chunks returned per source (only for advanced search)"
        ),
      maxResults: z
        .union([
          z
            .number()
            .min(0)
            .max(20)
            .refine(() => true),
          z.null(),
        ])
        .describe("Maximum number of search results"),
      timeRange: z
        .union([
          z.enum(["day", "week", "month", "year", "d", "w", "m", "y"]),
          z.null(),
        ])
        .describe("Time range back from current date to filter results"),
      days: z
        .union([
          z
            .number()
            .min(1)
            .refine(() => true),
          z.null(),
        ])
        .describe(
          "Number of days back from current date (only for news topic)"
        ),
      includeAnswer: z
        .union([
          z.union([z.boolean(), z.enum(["basic", "advanced"])]),
          z.null(),
        ])
        .describe(
          "Include LLM-generated answer: true/basic for quick answer, advanced for detailed answer"
        ),
      includeRawContent: z
        .union([
          z
            .union([z.boolean(), z.enum(["markdown", "text"])])
            .refine(() => true),
          z.null(),
        ])
        .describe(
          "Include cleaned HTML content: true/markdown for markdown format, text for plain text"
        ),
      includeImages: z
        .union([z.boolean().refine(() => true), z.null()])
        .describe("Also perform image search and include results"),
      includeImageDescriptions: z
        .union([z.boolean().refine(() => true), z.null()])
        .describe(
          "Add descriptive text for each image when includeImages is true"
        ),
      includeDomains: z
        .union([z.array(z.string()).refine(() => true), z.null()])
        .describe("List of domains to specifically include in search results"),
      excludeDomains: z
        .union([z.array(z.string()).refine(() => true), z.null()])
        .describe(
          "List of domains to specifically exclude from search results"
        ),
      country: z
        .union([
          z.enum([
            "afghanistan",
            "albania",
            "algeria",
            "andorra",
            "angola",
            "argentina",
            "armenia",
            "australia",
            "austria",
            "azerbaijan",
            "bahamas",
            "bahrain",
            "bangladesh",
            "barbados",
            "belarus",
            "belgium",
            "belize",
            "benin",
            "bhutan",
            "bolivia",
            "bosnia and herzegovina",
            "botswana",
            "brazil",
            "brunei",
            "bulgaria",
            "burkina faso",
            "burundi",
            "cambodia",
            "cameroon",
            "canada",
            "cape verde",
            "central african republic",
            "chad",
            "chile",
            "china",
            "colombia",
            "comoros",
            "congo",
            "costa rica",
            "croatia",
            "cuba",
            "cyprus",
            "czech republic",
            "denmark",
            "djibouti",
            "dominican republic",
            "ecuador",
            "egypt",
            "el salvador",
            "equatorial guinea",
            "eritrea",
            "estonia",
            "ethiopia",
            "fiji",
            "finland",
            "france",
            "gabon",
            "gambia",
            "georgia",
            "germany",
            "ghana",
            "greece",
            "guatemala",
            "guinea",
            "haiti",
            "honduras",
            "hungary",
            "iceland",
            "india",
            "indonesia",
            "iran",
            "iraq",
            "ireland",
            "israel",
            "italy",
            "jamaica",
            "japan",
            "jordan",
            "kazakhstan",
            "kenya",
            "kuwait",
            "kyrgyzstan",
            "latvia",
            "lebanon",
            "lesotho",
            "liberia",
            "libya",
            "liechtenstein",
            "lithuania",
            "luxembourg",
            "madagascar",
            "malawi",
            "malaysia",
            "maldives",
            "mali",
            "malta",
            "mauritania",
            "mauritius",
            "mexico",
            "moldova",
            "monaco",
            "mongolia",
            "montenegro",
            "morocco",
            "mozambique",
            "myanmar",
            "namibia",
            "nepal",
            "netherlands",
            "new zealand",
            "nicaragua",
            "niger",
            "nigeria",
            "north korea",
            "north macedonia",
            "norway",
            "oman",
            "pakistan",
            "panama",
            "papua new guinea",
            "paraguay",
            "peru",
            "philippines",
            "poland",
            "portugal",
            "qatar",
            "romania",
            "russia",
            "rwanda",
            "saudi arabia",
            "senegal",
            "serbia",
            "singapore",
            "slovakia",
            "slovenia",
            "somalia",
            "south africa",
            "south korea",
            "south sudan",
            "spain",
            "sri lanka",
            "sudan",
            "sweden",
            "switzerland",
            "syria",
            "taiwan",
            "tajikistan",
            "tanzania",
            "thailand",
            "togo",
            "trinidad and tobago",
            "tunisia",
            "turkey",
            "turkmenistan",
            "uganda",
            "ukraine",
            "united arab emirates",
            "united kingdom",
            "united states",
            "uruguay",
            "uzbekistan",
            "venezuela",
            "vietnam",
            "yemen",
            "zambia",
            "zimbabwe",
          ]),
          z.null(),
        ])
        .describe(
          "Boost search results from a specific country (only for general topic)"
        ),
    })
  ),
  execute: async ({
    query,
    autoParameters,
    topic,
    searchDepth = "basic",
    chunksPerSource,
    maxResults = 5,
    timeRange,
    days,
    includeAnswer,
    includeRawContent,
    includeImages,
    includeImageDescriptions,
    includeDomains,
    excludeDomains,
    country,
  }) => {
    try {
      // Check if TAVILY_API_KEY is available
      if (!process.env.TAVILY_API_KEY) {
        return `Web search is not available. Please set TAVILY_API_KEY environment variable to enable web search functionality.`;
      }

      // Initialize Tavily client and perform search using the SDK
      const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });

      // Build search options object
      const searchOptions: Record<string, unknown> = {
        max_results: maxResults,
        search_depth: searchDepth,
      };

      // Add optional parameters if provided
      if (autoParameters !== undefined)
        searchOptions.auto_parameters = autoParameters;
      if (topic !== undefined) searchOptions.topic = topic;
      if (chunksPerSource !== undefined)
        searchOptions.chunks_per_source = chunksPerSource;
      if (timeRange !== undefined) searchOptions.time_range = timeRange;
      if (days !== undefined) searchOptions.days = days;
      if (includeAnswer !== undefined)
        searchOptions.include_answer = includeAnswer;
      if (includeRawContent !== undefined)
        searchOptions.include_raw_content = includeRawContent;
      if (includeImages !== undefined)
        searchOptions.include_images = includeImages;
      if (includeImageDescriptions !== undefined)
        searchOptions.include_image_descriptions = includeImageDescriptions;
      if (includeDomains !== undefined)
        searchOptions.include_domains = includeDomains;
      if (excludeDomains !== undefined)
        searchOptions.exclude_domains = excludeDomains;
      if (country !== undefined) searchOptions.country = country;

      const searchResults = await tvly.search(query, searchOptions);

      // Format the results for better readability
      const formattedResults =
        searchResults.results
          ?.map(
            (
              result: { title: string; url: string; content: string },
              index: number
            ) =>
              `${index + 1}. **${result.title}**\n   URL: ${result.url}\n   ${
                result.content
              }\n`
          )
          .join("\n") || "No results found.";

      return `Search Results for "${query}":\n\n${formattedResults}\n\nNote: If you need more detailed information from any of these sources, you can use the extractWebContent tool with the specific URLs.`;
    } catch (error) {
      return `Search error: ${
        error instanceof Error ? error.message : "Unknown error occurred"
      }`;
    }
  },
});
