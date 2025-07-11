import { z } from "zod";

import { experimental_createMCPClient as createMCPClient } from "ai";
import { Experimental_StdioMCPTransport as StdioMCPTransport } from "ai/mcp-stdio";

// Zod schemas for Tavily tools
const tavilySearchSchema = z.object({
  query: z.string().describe("Search query"),
  search_depth: z
    .enum(["basic", "advanced"])
    .optional()
    .default("basic")
    .describe("The depth of the search. It can be 'basic' or 'advanced'"),
  topic: z
    .enum(["general", "news"])
    .optional()
    .default("general")
    .describe(
      "The category of the search. This will determine which of our agents will be used for the search"
    ),
  days: z
    .number()
    .optional()
    .default(3)
    .describe(
      "The number of days back from the current date to include in the search results. This specifies the time frame of data to be retrieved. Please note that this feature is only available when using the 'news' search topic"
    ),
  time_range: z
    .enum(["day", "week", "month", "year", "d", "w", "m", "y"])
    .optional()
    .describe(
      "The time range back from the current date to include in the search results. This feature is available for both 'general' and 'news' search topics"
    ),
  max_results: z
    .number()
    .min(5)
    .max(20)
    .optional()
    .default(10)
    .describe("The maximum number of search results to return"),
  include_images: z
    .boolean()
    .optional()
    .default(false)
    .describe("Include a list of query-related images in the response"),
  include_image_descriptions: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include a list of query-related images and their descriptions in the response"
    ),
  include_raw_content: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include the cleaned and parsed HTML content of each search result"
    ),
  include_domains: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "A list of domains to specifically include in the search results, if the user asks to search on specific sites set this to the domain of the site"
    ),
  exclude_domains: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "List of domains to specifically exclude, if the user asks to exclude a domain set this to the domain of the site"
    ),
  country: z
    .enum([
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
    ])
    .optional()
    .describe(
      "Boost search results from a specific country. This will prioritize content from the selected country in the search results. Available only if topic is general."
    ),
});

const tavilyExtractSchema = z.object({
  urls: z.array(z.string()).describe("List of URLs to extract content from"),
  extract_depth: z
    .enum(["basic", "advanced"])
    .optional()
    .default("basic")
    .describe(
      "Depth of extraction - 'basic' or 'advanced', if urls are linkedin use 'advanced' or if explicitly told to use advanced"
    ),
  include_images: z
    .boolean()
    .optional()
    .default(false)
    .describe(
      "Include a list of images extracted from the urls in the response"
    ),
  format: z
    .enum(["markdown", "text"])
    .optional()
    .default("markdown")
    .describe(
      "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency."
    ),
});

const tavilyCrawlSchema = z.object({
  url: z.string().describe("The root URL to begin the crawl"),
  max_depth: z
    .number()
    .min(1)
    .optional()
    .default(1)
    .describe(
      "Max depth of the crawl. Defines how far from the base URL the crawler can explore."
    ),
  max_breadth: z
    .number()
    .min(1)
    .optional()
    .default(20)
    .describe(
      "Max number of links to follow per level of the tree (i.e., per page)"
    ),
  limit: z
    .number()
    .min(1)
    .optional()
    .default(50)
    .describe("Total number of links the crawler will process before stopping"),
  instructions: z
    .string()
    .optional()
    .describe("Natural language instructions for the crawler"),
  select_paths: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)"
    ),
  select_domains: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "Regex patterns to select crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)"
    ),
  allow_external: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to allow following links that go to external domains"),
  categories: z
    .array(
      z.enum([
        "Careers",
        "Blog",
        "Documentation",
        "About",
        "Pricing",
        "Community",
        "Developers",
        "Contact",
        "Media",
      ])
    )
    .optional()
    .default([])
    .describe(
      "Filter URLs using predefined categories like documentation, blog, api, etc"
    ),
  extract_depth: z
    .enum(["basic", "advanced"])
    .optional()
    .default("basic")
    .describe(
      "Advanced extraction retrieves more data, including tables and embedded content, with higher success but may increase latency"
    ),
  format: z
    .enum(["markdown", "text"])
    .optional()
    .default("markdown")
    .describe(
      "The format of the extracted web page content. markdown returns content in markdown format. text returns plain text and may increase latency."
    ),
});

const tavilyMapSchema = z.object({
  url: z.string().describe("The root URL to begin the mapping"),
  max_depth: z
    .number()
    .min(1)
    .optional()
    .default(1)
    .describe(
      "Max depth of the mapping. Defines how far from the base URL the crawler can explore"
    ),
  max_breadth: z
    .number()
    .min(1)
    .optional()
    .default(20)
    .describe(
      "Max number of links to follow per level of the tree (i.e., per page)"
    ),
  limit: z
    .number()
    .min(1)
    .optional()
    .default(50)
    .describe("Total number of links the crawler will process before stopping"),
  instructions: z
    .string()
    .optional()
    .describe("Natural language instructions for the crawler"),
  select_paths: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "Regex patterns to select only URLs with specific path patterns (e.g., /docs/.*, /api/v1.*)"
    ),
  select_domains: z
    .array(z.string())
    .optional()
    .default([])
    .describe(
      "Regex patterns to select crawling to specific domains or subdomains (e.g., ^docs\\.example\\.com$)"
    ),
  allow_external: z
    .boolean()
    .optional()
    .default(false)
    .describe("Whether to allow following links that go to external domains"),
  categories: z
    .array(
      z.enum([
        "Careers",
        "Blog",
        "Documentation",
        "About",
        "Pricing",
        "Community",
        "Developers",
        "Contact",
        "Media",
      ])
    )
    .optional()
    .default([])
    .describe(
      "Filter URLs using predefined categories like documentation, blog, api, etc"
    ),
});

async function createTavilyClient() {
  const mcpClient = await createMCPClient({
    transport: new StdioMCPTransport({
      command: "npx",
      args: ["-y", "tavily-mcp@0.2.4"],
      env: { TAVILY_API_KEY: process.env.TAVILY_API_KEY || "" },
    }),
  });
  return mcpClient;
}

export const getTavilyTools = async () => {
  const client = await createTavilyClient();
  const tools = await client.tools({
    schemas: {
      "tavily-search": { inputSchema: tavilySearchSchema },
      "tavily-extract": { inputSchema: tavilyExtractSchema },
      "tavily-crawl": { inputSchema: tavilyCrawlSchema },
      "tavily-map": { inputSchema: tavilyMapSchema },
    },
  });

  return tools;
};
