// Export individual tools
export { searchWeb } from "./search-web";
export { extractWebContent } from "./extract-web-content";
export { getCurrentDateTime } from "./get-current-datetime";
export { resolveLibraryId } from "./documentation-reader";
export { getLibraryDocs } from "./documentation-reader";

// Export all tools as a single object for easy import
import { searchWeb } from "./search-web";
import { extractWebContent } from "./extract-web-content";
import { getCurrentDateTime } from "./get-current-datetime";
import { resolveLibraryId } from "./documentation-reader";
import { getLibraryDocs } from "./documentation-reader";

export const chatTools = {
  searchWeb,
  extractWebContent,
  getCurrentDateTime,
};

export const devTools = {
  searchWeb,
  extractWebContent,
  resolveLibraryId,
  getLibraryDocs,
};

export const researchTools = {
  searchWeb,
  extractWebContent,
  getCurrentDateTime,
};
