// MCP Tools for SODAX Brand Bible

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { 
  getBrandBible, 
  getSection, 
  getSubsection,
  searchBrandBible,
  clearCache
} from "../services/brandBible.js";
import { ResponseFormat } from "../types.js";
import { CHARACTER_LIMIT, SECTION_NAMES, SUBSECTION_NAMES, BRAND_BIBLE_URL } from "../constants.js";

// Zod Schemas
const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const GetOverviewInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

const GetSectionInputSchema = z.object({
  section_id: z.string()
    .regex(/^[1-6]$/, "Section ID must be 1-6")
    .describe("Section number (1-6): 1=Brand Essence, 2=Positioning, 3=Verbal Identity, 4=Visual Identity, 5=Channels, 6=Partnerships"),
  response_format: ResponseFormatSchema
}).strict();

const GetSubsectionInputSchema = z.object({
  subsection_id: z.string()
    .regex(/^\d+\.\d+$/, "Subsection ID must be in format X.Y (e.g., '3.1')")
    .describe("Subsection ID in format X.Y (e.g., '3.1' for Tone of Voice, '4.2' for Color Palette)"),
  response_format: ResponseFormatSchema
}).strict();

const SearchBrandBibleInputSchema = z.object({
  query: z.string()
    .min(2, "Query must be at least 2 characters")
    .max(200, "Query must not exceed 200 characters")
    .describe("Search query to find relevant brand guidelines (e.g., 'logo usage', 'tone of voice', 'color palette')"),
  limit: z.number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum number of results to return"),
  response_format: ResponseFormatSchema
}).strict();

const RefreshCacheInputSchema = z.object({}).strict();

/**
 * Registers all brand bible tools with the MCP server
 */
export function registerBrandBibleTools(server: McpServer): void {
  
  // Tool 1: Get Brand Bible Overview
  server.registerTool(
    "sodax_get_brand_overview",
    {
      title: "Get SODAX Brand Bible Overview",
      description: `Get an overview of the SODAX Brand Bible structure and contents.

This tool returns a high-level summary of all sections in the brand bible, helping you understand what brand guidelines are available.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Overview containing:
  - version: Current brand bible version
  - lastUpdated: When the brand bible was last updated
  - source: URL of the brand bible
  - sections: List of all major sections with their subsection counts
  - summary: Brief description of the brand bible's purpose

Use this tool first to understand the brand bible structure before querying specific sections.`,
      inputSchema: GetOverviewInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetOverviewInputSchema>) => {
      try {
        const data = await getBrandBible();
        
        const output = {
          version: data.version,
          lastUpdated: data.lastUpdated,
          source: BRAND_BIBLE_URL,
          sections: data.sections.map(s => ({
            id: s.id,
            title: s.title,
            subsectionCount: s.subsections.length
          })),
          summary: "This Brand Bible defines how SODAX should be represented externally. It sets the foundations for positioning, voice, and visual expression across all public contexts."
        };
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# SODAX Brand Bible Overview`,
            ``,
            `**Version:** ${data.version}`,
            `**Last Updated:** ${data.lastUpdated}`,
            `**Source:** ${BRAND_BIBLE_URL}`,
            ``,
            `## Summary`,
            output.summary,
            ``,
            `## Sections`,
            ``
          ];
          
          for (const section of output.sections) {
            lines.push(`### ${section.id}. ${section.title}`);
            lines.push(`- ${section.subsectionCount} subsections`);
            lines.push(``);
          }
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching brand bible overview: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool 2: Get Specific Section
  server.registerTool(
    "sodax_get_section",
    {
      title: "Get SODAX Brand Bible Section",
      description: `Get detailed content from a specific section of the SODAX Brand Bible.

Available sections:
- 1: Brand Essence and Foundations (overview, purpose, promise, values, personality, core idea)
- 2: Positioning and Messaging Architecture (market context, positioning, audiences, messaging pillars)
- 3: Verbal Identity (tone of voice, writing principles, messaging do's and don'ts)
- 4: Visual Identity (logo, colors, typography, iconography, layout, motion, accessibility)
- 5: Brand Expression Across Channels (X, Reddit, YouTube guidelines)
- 6: Brand Use in Partnerships (partner announcements, visual presence, case studies)

Args:
  - section_id (string): Section number from 1-6
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Section content including:
  - sectionId: The section number
  - title: Section title
  - content: Section introduction/overview text
  - subsections: List of all subsections with their titles and content

Use this to get comprehensive information about a specific brand area.`,
      inputSchema: GetSectionInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetSectionInputSchema>) => {
      try {
        const section = await getSection(params.section_id);
        
        if (!section) {
          return {
            content: [{
              type: "text",
              text: `Error: Section '${params.section_id}' not found. Valid sections are 1-6.`
            }]
          };
        }
        
        const output = {
          sectionId: section.id,
          title: section.title,
          content: section.content,
          subsections: section.subsections.map(sub => ({
            id: sub.id,
            title: sub.title,
            content: sub.content
          })),
          source: BRAND_BIBLE_URL
        };
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# ${section.id}. ${section.title}`,
            ``,
            section.content,
            ``,
            `## Subsections`,
            ``
          ];
          
          for (const sub of section.subsections) {
            lines.push(`### ${sub.id} ${sub.title}`);
            lines.push(sub.content);
            lines.push(``);
          }
          
          lines.push(`---`);
          lines.push(`*Source: ${BRAND_BIBLE_URL}*`);
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }
        
        // Truncate if too long
        if (textContent.length > CHARACTER_LIMIT) {
          textContent = textContent.slice(0, CHARACTER_LIMIT) + 
            "\n\n[Content truncated. Use sodax_get_subsection for specific subsections.]";
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching section: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool 3: Get Specific Subsection
  server.registerTool(
    "sodax_get_subsection",
    {
      title: "Get SODAX Brand Bible Subsection",
      description: `Get detailed content from a specific subsection of the SODAX Brand Bible.

Common subsections:
- 1.4: Brand Values
- 1.5: Brand Personality
- 2.4: SODAX Positioning Statement
- 2.6: Messaging Pillars
- 3.1: Tone of Voice
- 3.2: Writing Principles
- 3.5: Messaging Do's and Don'ts
- 4.1: Logo Usage
- 4.2: Selected Color Palette
- 4.3: Typography
- 4.7: Accessibility Standards

Args:
  - subsection_id (string): Subsection ID in format X.Y (e.g., '3.1')
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Subsection content including:
  - id: Subsection ID
  - title: Subsection title
  - content: Full subsection content

Use this for detailed information on specific brand guidelines.`,
      inputSchema: GetSubsectionInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetSubsectionInputSchema>) => {
      try {
        const subsection = await getSubsection(params.subsection_id);
        
        if (!subsection) {
          // Provide helpful error with available subsections
          const availableIds = Object.keys(SUBSECTION_NAMES).join(", ");
          return {
            content: [{
              type: "text",
              text: `Error: Subsection '${params.subsection_id}' not found.\n\nAvailable subsections: ${availableIds}`
            }]
          };
        }
        
        const output = {
          id: subsection.id,
          title: subsection.title,
          content: subsection.content,
          source: BRAND_BIBLE_URL
        };
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            `# ${subsection.id} ${subsection.title}`,
            ``,
            subsection.content,
            ``,
            `---`,
            `*Source: ${BRAND_BIBLE_URL}*`
          ].join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error fetching subsection: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool 4: Search Brand Bible
  server.registerTool(
    "sodax_search_brand_bible",
    {
      title: "Search SODAX Brand Bible",
      description: `Search the SODAX Brand Bible for relevant content based on keywords or topics.

This tool performs a relevance-based search across all sections and subsections of the brand bible.

Args:
  - query (string): Search query (e.g., 'logo guidelines', 'tone of voice', 'color palette', 'B2B messaging')
  - limit (number): Maximum results to return, 1-20 (default: 5)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Search results containing:
  - query: The search query used
  - results: Array of matching sections/subsections with relevance scores
  - totalResults: Number of matches found

Example queries:
- "logo" - Find logo usage guidelines
- "tone voice" - Find tone of voice guidelines
- "colors brand" - Find color palette information
- "B2B builders" - Find messaging for B2B audience
- "social media" - Find channel-specific guidelines

Use this tool when you need to find specific brand information but don't know the exact section.`,
      inputSchema: SearchBrandBibleInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof SearchBrandBibleInputSchema>) => {
      try {
        const results = await searchBrandBible(params.query);
        const limitedResults = results.slice(0, params.limit);
        
        const output = {
          query: params.query,
          results: limitedResults,
          totalResults: results.length,
          source: BRAND_BIBLE_URL
        };
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (limitedResults.length === 0) {
            textContent = `# Search Results for "${params.query}"\n\nNo matching content found. Try different keywords or use sodax_get_brand_overview to see available sections.`;
          } else {
            const lines = [
              `# Search Results for "${params.query}"`,
              ``,
              `Found ${results.length} results (showing ${limitedResults.length}):`,
              ``
            ];
            
            for (const result of limitedResults) {
              const location = result.subsectionId 
                ? `${result.subsectionId} ${result.subsectionTitle}`
                : `${result.sectionId}. ${result.sectionTitle}`;
              
              lines.push(`## ${location}`);
              lines.push(`*Relevance: ${result.relevance}*`);
              lines.push(``);
              lines.push(result.content.slice(0, 500) + (result.content.length > 500 ? "..." : ""));
              lines.push(``);
            }
            
            lines.push(`---`);
            lines.push(`*Source: ${BRAND_BIBLE_URL}*`);
            
            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(output, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error searching brand bible: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool 5: Refresh Cache
  server.registerTool(
    "sodax_refresh_brand_bible",
    {
      title: "Refresh SODAX Brand Bible Cache",
      description: `Force refresh the cached brand bible data from Notion.

The brand bible is cached for 5 minutes to improve performance. Use this tool to fetch the latest version immediately if you know updates have been made.

Args: None

Returns:
  Confirmation of cache refresh with new version and timestamp.

Use this when you need to ensure you have the absolute latest brand guidelines.`,
      inputSchema: RefreshCacheInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async () => {
      try {
        clearCache();
        const data = await getBrandBible();
        
        const output = {
          status: "success",
          message: "Brand bible cache refreshed successfully",
          version: data.version,
          lastUpdated: data.lastUpdated,
          fetchedAt: data.fetchedAt.toISOString(),
          source: BRAND_BIBLE_URL
        };
        
        return {
          content: [{
            type: "text",
            text: `✓ Brand Bible cache refreshed\n\nVersion: ${data.version}\nLast Updated: ${data.lastUpdated}\nFetched At: ${data.fetchedAt.toISOString()}`
          }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error refreshing cache: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );

  // Tool 6: List All Subsections
  server.registerTool(
    "sodax_list_subsections",
    {
      title: "List All SODAX Brand Bible Subsections",
      description: `List all available subsections in the SODAX Brand Bible.

This tool provides a complete reference of all subsection IDs and titles, useful for knowing exactly what content is available.

Args:
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  Complete list of all subsections organized by section.

Use this as a reference when you need to find the correct subsection ID.`,
      inputSchema: GetOverviewInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetOverviewInputSchema>) => {
      try {
        const output = {
          sections: Object.entries(SECTION_NAMES).map(([id, title]) => ({
            id,
            title,
            subsections: Object.entries(SUBSECTION_NAMES)
              .filter(([subId]) => subId.startsWith(id + "."))
              .map(([subId, subTitle]) => ({ id: subId, title: subTitle }))
          }))
        };
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# SODAX Brand Bible - All Subsections`,
            ``
          ];
          
          for (const section of output.sections) {
            lines.push(`## ${section.id}. ${section.title}`);
            lines.push(``);
            for (const sub of section.subsections) {
              lines.push(`- **${sub.id}**: ${sub.title}`);
            }
            lines.push(``);
          }
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return {
          content: [{
            type: "text",
            text: `Error listing subsections: ${error instanceof Error ? error.message : String(error)}`
          }]
        };
      }
    }
  );
}
