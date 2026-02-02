#!/usr/bin/env node
/**
 * SODAX MCP Server
 * 
 * Unified MCP server providing access to:
 * - Brand Bible: Guidelines, voice, visual identity, messaging
 * - SODAX API: Chains, tokens, transactions, volume, partners, token supply
 * 
 * Brand bible is fetched from Notion (auto-updates on cache expiry).
 * API data is fetched live from api.sodax.com.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { registerBrandBibleTools } from "./tools/brandBible.js";
import { registerSodaxApiTools } from "./tools/sodaxApi.js";

// Get directory path for serving static files
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create MCP server instance
const server = new McpServer({
  name: "sodax-mcp-server",
  version: "1.0.0"
});

// Register all tools
registerBrandBibleTools(server);
registerSodaxApiTools(server);

/**
 * Run the server using stdio transport (for local use)
 */
async function runStdio(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("SODAX MCP server running via stdio");
}

/**
 * Run the server using HTTP transport (for remote/Coolify deployment)
 */
async function runHTTP(): Promise<void> {
  const app = express();
  app.use(express.json());

  // Serve static files (images, etc.)
  app.use(express.static(join(__dirname, "public")));

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ 
      status: "healthy", 
      service: "sodax-mcp-server",
      version: "1.0.0"
    });
  });

  // MCP endpoint
  app.post("/mcp", async (req: Request, res: Response) => {
    // Create new transport for each request (stateless)
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true
    });

    res.on("close", () => transport.close());

    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  // Landing page (HTML)
  app.get("/", (_req: Request, res: Response) => {
    try {
      const htmlPath = join(__dirname, "public", "index.html");
      const html = readFileSync(htmlPath, "utf-8");
      res.type("html").send(html);
    } catch {
      // Fallback to JSON if HTML not found
      res.redirect("/api");
    }
  });

  // API info endpoint (JSON)
  app.get("/api", (_req: Request, res: Response) => {
    res.json({
      name: "SODAX MCP Server",
      version: "1.0.0",
      description: "Unified MCP server for SODAX - brand guidelines, API data, and more",
      endpoints: {
        mcp: "/mcp",
        health: "/health",
        api: "/api"
      },
      sources: {
        brandBible: {
          description: "SODAX Brand Bible - guidelines, voice, visual identity",
          source: "https://iconfoundation.notion.site/brand-bible-v1",
          tools: [
            "sodax_get_brand_overview",
            "sodax_get_section",
            "sodax_get_subsection",
            "sodax_search_brand_bible",
            "sodax_refresh_brand_bible",
            "sodax_list_subsections"
          ]
        },
        sodaxApi: {
          description: "SODAX API - chains, tokens, transactions, volume, partners",
          source: "https://api.sodax.com/v1/be/docs",
          tools: [
            "sodax_get_supported_chains",
            "sodax_get_swap_tokens",
            "sodax_get_transaction",
            "sodax_get_user_transactions",
            "sodax_get_volume",
            "sodax_get_orderbook",
            "sodax_get_money_market_assets",
            "sodax_get_user_position",
            "sodax_get_partners",
            "sodax_get_token_supply"
          ]
        }
      }
    });
  });

  const port = parseInt(process.env.PORT || "3000");
  app.listen(port, "0.0.0.0", () => {
    console.error(`SODAX MCP server running on http://0.0.0.0:${port}`);
    console.error(`MCP endpoint: http://0.0.0.0:${port}/mcp`);
    console.error(`Health check: http://0.0.0.0:${port}/health`);
  });
}

// Main entry point
async function main(): Promise<void> {
  const transport = process.env.TRANSPORT || "http";
  
  console.error(`Starting SODAX MCP Server (transport: ${transport})`);
  
  if (transport === "stdio") {
    await runStdio();
  } else {
    await runHTTP();
  }
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
