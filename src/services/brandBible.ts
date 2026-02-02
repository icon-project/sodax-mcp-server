// Brand Bible Service - Fetches and parses the SODAX Brand Bible from Notion

import axios from "axios";
import * as cheerio from "cheerio";
import { 
  BrandBibleData, 
  BrandSection, 
  BrandSubsection,
  SearchResult 
} from "../types.js";
import { 
  BRAND_BIBLE_URL, 
  CACHE_TTL_MS,
  SECTION_NAMES,
  SUBSECTION_NAMES 
} from "../constants.js";

// Cache for brand bible data
let cachedData: BrandBibleData | null = null;
let cacheTimestamp: number = 0;

/**
 * Fetches the brand bible HTML from Notion
 */
async function fetchBrandBibleHtml(): Promise<string> {
  try {
    const response = await axios.get(BRAND_BIBLE_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SODAX-Brand-Bible-MCP/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      },
      timeout: 30000
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 404) {
        throw new Error("Brand Bible page not found. The URL may have changed.");
      }
      if (error.code === "ECONNABORTED") {
        throw new Error("Request timed out while fetching Brand Bible. Please try again.");
      }
      throw new Error(`Failed to fetch Brand Bible: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Parses the HTML content and extracts brand bible sections
 */
function parseBrandBible(html: string): BrandBibleData {
  const $ = cheerio.load(html);
  
  // Extract version and last updated from the page
  const pageText = $("body").text();
  const versionMatch = pageText.match(/Brand Bible v([\d.]+)/);
  const dateMatch = pageText.match(/Last updated\s*[-–]\s*(.+?)(?=This Brand Bible|$)/i);
  
  const version = versionMatch ? versionMatch[1] : "unknown";
  const lastUpdated = dateMatch ? dateMatch[1].trim() : "unknown";
  
  // Extract the main content
  const rawContent = extractTextContent($);
  
  // Parse sections from the content
  const sections = parseSections(rawContent);
  
  return {
    version,
    lastUpdated,
    sections,
    rawContent,
    fetchedAt: new Date()
  };
}

/**
 * Extracts clean text content from the HTML
 */
function extractTextContent($: cheerio.CheerioAPI): string {
  // Remove script and style elements
  $("script, style, noscript").remove();
  
  // Get main content area
  const mainContent = $("main, article, .notion-page-content, [class*='page']").first();
  const contentArea = mainContent.length > 0 ? mainContent : $("body");
  
  // Extract text preserving some structure
  let text = "";
  contentArea.find("*").each((_, elem) => {
    const $elem = $(elem);
    const tagName = elem.type === "tag" ? elem.tagName?.toLowerCase() : "";
    
    if (["h1", "h2", "h3", "h4"].includes(tagName)) {
      text += "\n\n## " + $elem.text().trim() + "\n";
    } else if (["p", "div"].includes(tagName)) {
      const content = $elem.clone().children().remove().end().text().trim();
      if (content) {
        text += content + "\n";
      }
    } else if (["li"].includes(tagName)) {
      text += "• " + $elem.text().trim() + "\n";
    }
  });
  
  // Clean up the text
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^\s+|\s+$/g, "")
    .trim();
  
  return text;
}

/**
 * Parses the raw content into structured sections
 */
function parseSections(content: string): BrandSection[] {
  const sections: BrandSection[] = [];
  
  // Create sections based on known structure
  for (const [sectionNum, sectionName] of Object.entries(SECTION_NAMES)) {
    const subsections: BrandSubsection[] = [];
    
    // Find subsections for this section
    for (const [subId, subName] of Object.entries(SUBSECTION_NAMES)) {
      if (subId.startsWith(sectionNum + ".")) {
        // Extract content related to this subsection from rawContent
        const subsectionContent = extractSubsectionContent(content, subId, subName);
        subsections.push({
          id: subId,
          title: subName,
          content: subsectionContent
        });
      }
    }
    
    // Extract section intro content
    const sectionContent = extractSectionContent(content, sectionNum, sectionName);
    
    sections.push({
      id: sectionNum,
      title: sectionName,
      content: sectionContent,
      subsections
    });
  }
  
  return sections;
}

/**
 * Extracts content for a specific section
 */
function extractSectionContent(content: string, sectionNum: string, sectionName: string): string {
  // Look for section content in the raw text
  const sectionRegex = new RegExp(
    `${sectionNum}\\.\\s*${escapeRegex(sectionName)}([\\s\\S]*?)(?=\\d+\\.\\s+[A-Z]|$)`,
    "i"
  );
  
  const match = content.match(sectionRegex);
  if (match) {
    return match[1].trim().slice(0, 2000); // Limit content length
  }
  
  // Return a default description based on section
  return getDefaultSectionDescription(sectionNum);
}

/**
 * Extracts content for a specific subsection
 */
function extractSubsectionContent(content: string, subId: string, subName: string): string {
  const escapedName = escapeRegex(subName);
  const subsectionRegex = new RegExp(
    `${subId}\\s*${escapedName}([\\s\\S]*?)(?=\\d+\\.\\d+|\\d+\\.|$)`,
    "i"
  );
  
  const match = content.match(subsectionRegex);
  if (match) {
    return match[1].trim().slice(0, 1500);
  }
  
  return `Content for ${subName}. Please refer to the full Brand Bible for details.`;
}

/**
 * Escapes special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Returns default descriptions for sections
 */
function getDefaultSectionDescription(sectionNum: string): string {
  const descriptions: Record<string, string> = {
    "1": "Defines SODAX's core identity, purpose, promise, values, personality, and central brand idea.",
    "2": "Covers market positioning, audience segmentation, messaging pillars, value propositions, and competitive differentiation.",
    "3": "SODAX is serious infrastructure. Our voice should feel calm, competent, and human. We translate complex cross-network execution into language that is clear, credible, and easy to repeat.",
    "4": "SODAX's visual identity is adaptive, not rigid. It scales in intensity based on context, intent, and user mindset.",
    "5": "Defines how the SODAX brand should appear across public channels with consistency of meaning while allowing platform-native expression.",
    "6": "Defines how SODAX should be represented when it appears outside its own managed channels."
  };
  
  return descriptions[sectionNum] || "Brand guidelines content.";
}

/**
 * Fetches brand bible data with caching
 */
export async function getBrandBible(): Promise<BrandBibleData> {
  const now = Date.now();
  
  // Return cached data if still valid
  if (cachedData && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedData;
  }
  
  // Fetch fresh data
  const html = await fetchBrandBibleHtml();
  cachedData = parseBrandBible(html);
  cacheTimestamp = now;
  
  return cachedData;
}

/**
 * Gets a specific section by ID
 */
export async function getSection(sectionId: string): Promise<BrandSection | null> {
  const data = await getBrandBible();
  return data.sections.find(s => s.id === sectionId) || null;
}

/**
 * Gets a specific subsection by ID
 */
export async function getSubsection(subsectionId: string): Promise<BrandSubsection | null> {
  const data = await getBrandBible();
  
  for (const section of data.sections) {
    const subsection = section.subsections.find(sub => sub.id === subsectionId);
    if (subsection) {
      return subsection;
    }
  }
  
  return null;
}

/**
 * Searches the brand bible for relevant content
 */
export async function searchBrandBible(query: string): Promise<SearchResult[]> {
  const data = await getBrandBible();
  const results: SearchResult[] = [];
  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);
  
  for (const section of data.sections) {
    // Check section content
    const sectionRelevance = calculateRelevance(
      section.title + " " + section.content, 
      queryTerms
    );
    
    if (sectionRelevance > 0) {
      results.push({
        sectionId: section.id,
        sectionTitle: section.title,
        content: section.content,
        relevance: sectionRelevance
      });
    }
    
    // Check subsections
    for (const sub of section.subsections) {
      const subRelevance = calculateRelevance(
        sub.title + " " + sub.content,
        queryTerms
      );
      
      if (subRelevance > 0) {
        results.push({
          sectionId: section.id,
          sectionTitle: section.title,
          subsectionId: sub.id,
          subsectionTitle: sub.title,
          content: sub.content,
          relevance: subRelevance
        });
      }
    }
  }
  
  // Sort by relevance
  results.sort((a, b) => b.relevance - a.relevance);
  
  return results;
}

/**
 * Calculates relevance score for a piece of content
 */
function calculateRelevance(content: string, queryTerms: string[]): number {
  const contentLower = content.toLowerCase();
  let score = 0;
  
  for (const term of queryTerms) {
    // Exact match bonus
    if (contentLower.includes(term)) {
      score += 10;
      
      // Count occurrences
      const matches = contentLower.split(term).length - 1;
      score += Math.min(matches, 5);
    }
  }
  
  // Check for common brand-related keywords
  const brandKeywords = [
    "logo", "color", "typography", "font", "voice", "tone", 
    "message", "audience", "value", "positioning", "visual",
    "identity", "brand", "sodax"
  ];
  
  for (const keyword of brandKeywords) {
    if (queryTerms.some(t => t.includes(keyword) || keyword.includes(t))) {
      if (contentLower.includes(keyword)) {
        score += 5;
      }
    }
  }
  
  return score;
}

/**
 * Clears the cache (useful for testing or manual refresh)
 */
export function clearCache(): void {
  cachedData = null;
  cacheTimestamp = 0;
}
