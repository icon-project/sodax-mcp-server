// MCP Tools for SODAX API

import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  getSupportedChains,
  getSwapTokens,
  getIntentByTxHash,
  getIntentByHash,
  getUserIntents,
  getOrderbook,
  getVolume,
  getAllMoneyMarketAssets,
  getUserMoneyMarketPosition,
  getPartners,
  getPartnerSummary,
  getTotalSupply,
  getCirculatingSupply,
  getAllSupplyData
} from "../services/sodaxApi.js";
import { ResponseFormat } from "../types.js";

const SODAX_API_DOCS = "https://api.sodax.com/v1/be/docs";

// Shared schemas
const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

const EmptyInputSchema = z.object({
  response_format: ResponseFormatSchema
}).strict();

/**
 * Registers all SODAX API tools with the MCP server
 */
export function registerSodaxApiTools(server: McpServer): void {

  // ============ Config Tools ============

  // Tool: Get Supported Chains
  server.registerTool(
    "sodax_get_supported_chains",
    {
      title: "Get SODAX Supported Chains",
      description: `Get list of all blockchain networks supported by SODAX.

Returns information about each supported chain including chain ID and name.

Use this to answer questions like:
- "What chains does SODAX support?"
- "Is Solana/Base/Arbitrum supported?"
- "List all networks I can swap on"

Source: ${SODAX_API_DOCS}`,
      inputSchema: EmptyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof EmptyInputSchema>) => {
      try {
        const chains = await getSupportedChains();
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            "# SODAX Supported Chains",
            "",
            `Total: ${chains.length} chains`,
            "",
            "| Chain ID | Name |",
            "|----------|------|"
          ];
          for (const chain of chains) {
            lines.push(`| ${chain.chainId} | ${chain.name || 'Unknown'} |`);
          }
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(chains, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { chains, total: chains.length }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // Tool: Get Swap Tokens
  const GetSwapTokensSchema = z.object({
    chain_id: z.number().int().optional().describe("Optional chain ID to filter tokens by network"),
    response_format: ResponseFormatSchema
  }).strict();

  server.registerTool(
    "sodax_get_swap_tokens",
    {
      title: "Get SODAX Swap Tokens",
      description: `Get list of tokens available for swapping on SODAX.

Args:
  - chain_id (number, optional): Filter by specific chain ID
  - response_format: Output format

Returns list of tokens with symbol, address, decimals.

Use this to answer:
- "What tokens can I swap?"
- "What tokens are available on Base?"
- "Is USDC supported?"

Source: ${SODAX_API_DOCS}`,
      inputSchema: GetSwapTokensSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetSwapTokensSchema>) => {
      try {
        const tokens = await getSwapTokens(params.chain_id);
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# SODAX Swap Tokens${params.chain_id ? ` (Chain ${params.chain_id})` : ''}`,
            "",
            `Total: ${tokens.length} tokens`,
            "",
            "| Symbol | Address | Decimals |",
            "|--------|---------|----------|"
          ];
          for (const token of tokens.slice(0, 50)) { // Limit display
            lines.push(`| ${token.symbol} | ${token.address?.slice(0, 10)}... | ${token.decimals} |`);
          }
          if (tokens.length > 50) {
            lines.push(``, `*Showing 50 of ${tokens.length} tokens*`);
          }
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(tokens, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { tokens, total: tokens.length }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // ============ Intent/Transaction Tools ============

  // Tool: Get Transaction by Hash
  const GetTransactionSchema = z.object({
    tx_hash: z.string().min(10).describe("Transaction hash to look up"),
    response_format: ResponseFormatSchema
  }).strict();

  server.registerTool(
    "sodax_get_transaction",
    {
      title: "Get SODAX Transaction",
      description: `Look up a SODAX transaction/intent by transaction hash.

Args:
  - tx_hash (string): The transaction hash to look up
  - response_format: Output format

Returns transaction details including status, source/destination chains, amounts.

Use this to answer:
- "What's the status of transaction 0x...?"
- "Look up this tx hash"
- "Did my swap complete?"

Source: ${SODAX_API_DOCS}`,
      inputSchema: GetTransactionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetTransactionSchema>) => {
      try {
        const intent = await getIntentByTxHash(params.tx_hash);
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            "# Transaction Details",
            "",
            `**Intent Hash:** ${intent.intentHash}`,
            `**Status:** ${intent.status}`,
            `**Source Chain:** ${intent.sourceChainId}`,
            `**Destination Chain:** ${intent.destinationChainId}`,
            "",
            "```json",
            JSON.stringify(intent, null, 2),
            "```"
          ].join("\n");
        } else {
          textContent = JSON.stringify(intent, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: intent
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // Tool: Get User Intents
  const GetUserIntentsSchema = z.object({
    user_address: z.string().min(10).describe("User wallet address"),
    response_format: ResponseFormatSchema
  }).strict();

  server.registerTool(
    "sodax_get_user_transactions",
    {
      title: "Get User SODAX Transactions",
      description: `Get transaction history for a specific user address.

Args:
  - user_address (string): Wallet address to look up
  - response_format: Output format

Returns list of user's intents/transactions on SODAX.

Use this to answer:
- "Show my recent swaps"
- "What transactions has this address made?"
- "User's SODAX history"

Source: ${SODAX_API_DOCS}`,
      inputSchema: GetUserIntentsSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetUserIntentsSchema>) => {
      try {
        const history = await getUserIntents(params.user_address);
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# Transaction History`,
            `**Address:** ${params.user_address}`,
            `**Total:** ${history.total || history.intents?.length || 0}`,
            ""
          ];
          
          if (history.intents && history.intents.length > 0) {
            for (const intent of history.intents.slice(0, 10)) {
              lines.push(`- **${intent.status}**: ${intent.intentHash?.slice(0, 16)}...`);
            }
          } else {
            lines.push("No transactions found.");
          }
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(history, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: history
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // ============ Volume/Stats Tools ============

  // Tool: Get Volume
  const GetVolumeSchema = z.object({
    limit: z.number().int().min(1).max(100).default(20).describe("Number of records to return"),
    response_format: ResponseFormatSchema
  }).strict();

  server.registerTool(
    "sodax_get_volume",
    {
      title: "Get SODAX Volume",
      description: `Get SODAX trading volume data (filled intents).

Args:
  - limit (number): Number of records (default 20, max 100)
  - response_format: Output format

Returns paginated list of filled intents showing trading activity.

Use this to answer:
- "What's the trading volume?"
- "Show recent filled orders"
- "How active is SODAX?"

Source: ${SODAX_API_DOCS}`,
      inputSchema: GetVolumeSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetVolumeSchema>) => {
      try {
        const volume = await getVolume(1, params.limit);
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            "# SODAX Volume Data",
            "",
            `**Total Records:** ${volume.total}`,
            `**Showing:** ${volume.items?.length || 0}`,
            "",
            "```json",
            JSON.stringify(volume.items?.slice(0, 10), null, 2),
            "```"
          ].join("\n");
        } else {
          textContent = JSON.stringify(volume, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: volume
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // Tool: Get Orderbook
  server.registerTool(
    "sodax_get_orderbook",
    {
      title: "Get SODAX Orderbook",
      description: `Get recent orderbook entries from SODAX solvers.

Returns current open orders/intents waiting to be filled.

Use this to answer:
- "What's in the orderbook?"
- "Show pending orders"
- "Current open intents"

Source: ${SODAX_API_DOCS}`,
      inputSchema: EmptyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof EmptyInputSchema>) => {
      try {
        const orderbook = await getOrderbook();
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            "# SODAX Orderbook",
            "",
            `**Entries:** ${orderbook.length}`,
            "",
            "```json",
            JSON.stringify(orderbook.slice(0, 20), null, 2),
            "```"
          ].join("\n");
        } else {
          textContent = JSON.stringify(orderbook, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { entries: orderbook, total: orderbook.length }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // ============ Money Market Tools ============

  // Tool: Get Money Market Assets
  server.registerTool(
    "sodax_get_money_market_assets",
    {
      title: "Get SODAX Money Market Assets",
      description: `Get all assets available in SODAX Money Market (lending/borrowing).

Returns list of assets that can be supplied or borrowed.

Use this to answer:
- "What can I lend on SODAX?"
- "What assets are in the money market?"
- "Borrowing options"

Source: ${SODAX_API_DOCS}`,
      inputSchema: EmptyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof EmptyInputSchema>) => {
      try {
        const assets = await getAllMoneyMarketAssets();
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            "# SODAX Money Market Assets",
            "",
            `**Total:** ${assets.length} assets`,
            ""
          ];
          
          for (const asset of assets) {
            lines.push(`- **${asset.symbol}**: ${asset.reserveAddress?.slice(0, 16)}...`);
          }
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(assets, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { assets, total: assets.length }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // Tool: Get User Money Market Position
  const GetUserPositionSchema = z.object({
    user_address: z.string().min(10).describe("User wallet address"),
    response_format: ResponseFormatSchema
  }).strict();

  server.registerTool(
    "sodax_get_user_position",
    {
      title: "Get User Money Market Position",
      description: `Get a user's money market position (supplies and borrows).

Args:
  - user_address (string): Wallet address to look up
  - response_format: Output format

Returns user's lending/borrowing positions.

Use this to answer:
- "What are my lending positions?"
- "How much have I borrowed?"
- "User's money market status"

Source: ${SODAX_API_DOCS}`,
      inputSchema: GetUserPositionSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof GetUserPositionSchema>) => {
      try {
        const position = await getUserMoneyMarketPosition(params.user_address);
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            "# Money Market Position",
            "",
            `**Address:** ${params.user_address}`,
            "",
            "```json",
            JSON.stringify(position, null, 2),
            "```"
          ].join("\n");
        } else {
          textContent = JSON.stringify(position, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: position
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // ============ Partners Tools ============

  // Tool: Get Partners
  server.registerTool(
    "sodax_get_partners",
    {
      title: "Get SODAX Partners",
      description: `Get list of SODAX integration partners.

Returns all partners integrated with SODAX.

Use this to answer:
- "Who are SODAX's partners?"
- "List integrations"
- "What projects use SODAX?"

Source: ${SODAX_API_DOCS}`,
      inputSchema: EmptyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof EmptyInputSchema>) => {
      try {
        const partners = await getPartners();
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            "# SODAX Partners",
            "",
            `**Total:** ${partners.length} partners`,
            ""
          ];
          
          for (const partner of partners) {
            lines.push(`- ${partner.name || partner.receiver}`);
          }
          
          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(partners, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: { partners, total: partners.length }
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );

  // ============ SODA Token Tools ============

  // Tool: Get Token Supply
  server.registerTool(
    "sodax_get_token_supply",
    {
      title: "Get SODA Token Supply",
      description: `Get SODA token supply information.

Returns total supply and circulating supply of the SODA token.

Use this to answer:
- "What's SODA's total supply?"
- "Circulating supply of SODA?"
- "Token supply stats"

Source: ${SODAX_API_DOCS}`,
      inputSchema: EmptyInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: z.infer<typeof EmptyInputSchema>) => {
      try {
        const supply = await getAllSupplyData();
        
        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = [
            "# SODA Token Supply",
            "",
            `**Total Supply:** ${supply.totalSupply}`,
            `**Circulating Supply:** ${supply.circulatingSupply}`,
            "",
            "```json",
            JSON.stringify(supply, null, 2),
            "```"
          ].join("\n");
        } else {
          textContent = JSON.stringify(supply, null, 2);
        }
        
        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: supply
        };
      } catch (error) {
        return {
          content: [{ type: "text", text: `Error: ${error instanceof Error ? error.message : String(error)}` }]
        };
      }
    }
  );
}
