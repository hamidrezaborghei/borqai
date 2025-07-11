// Export individual tools
export { getTavilyTools } from "./tavily-tools";
export { getDocumentationTools } from "./context7-tools";

// Export all tools as a single object for easy import
import { getTavilyTools } from "./tavily-tools";
import { getDocumentationTools } from "./context7-tools";

export const chatTools = {
  ...(await getTavilyTools()),
};

export const devTools = {
  ...(await getTavilyTools()),
  ...(await getDocumentationTools()),
};

export const researchTools = {
  ...(await getTavilyTools()),
};
