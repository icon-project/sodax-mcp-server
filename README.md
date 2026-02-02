# SODAX MCP Server

Unified MCP (Model Context Protocol) server for SODAX. Enables AI assistants to access brand guidelines, live API data, and more.

## Overview

This server provides a web interface and MCP endpoint for AI assistants to query SODAX resources.

**Landing Page:** Visit the deployed URL to see connection instructions and available tools.

## MCP Ecosystem

For complete SODAX context, configure these MCP servers:

| MCP Server | URL | Description |
|------------|-----|-------------|
| **SODAX MCP** (this repo) | `https://your-domain.com/mcp` | Brand bible + live API data |
| **SDK Documentation** (GitBook) | `https://docs.sodax.com/~gitbook/mcp` | Developer docs, code examples |

## What's Included

| Source | Description | Auto-updates |
|--------|-------------|--------------|
| **Brand Bible** | Guidelines, voice, visual identity, messaging | ✅ Every 5 min from Notion |
| **SODAX API** | Chains, tokens, transactions, volume, partners | ✅ Live from api.sodax.com |

## Available Tools

### Brand Bible Tools (6 tools)

| Tool | Description |
|------|-------------|
| `sodax_get_brand_overview` | Get high-level overview of the brand bible |
| `sodax_get_section` | Get a specific section (1-6) |
| `sodax_get_subsection` | Get a specific subsection (e.g., 3.1) |
| `sodax_search_brand_bible` | Search for brand guidelines by keyword |
| `sodax_refresh_brand_bible` | Force refresh cached data |
| `sodax_list_subsections` | List all subsections for reference |

### SODAX API Tools (10 tools)

| Tool | Description |
|------|-------------|
| `sodax_get_supported_chains` | List all supported blockchain networks |
| `sodax_get_swap_tokens` | Get available tokens for swapping |
| `sodax_get_transaction` | Look up transaction by hash |
| `sodax_get_user_transactions` | Get user's transaction history |
| `sodax_get_volume` | Get trading volume data |
| `sodax_get_orderbook` | Get current orderbook entries |
| `sodax_get_money_market_assets` | List lending/borrowing assets |
| `sodax_get_user_position` | Get user's money market position |
| `sodax_get_partners` | List SODAX integration partners |
| `sodax_get_token_supply` | Get SODA token supply info |

## Deployment Options

### Option 1: Docker (Recommended)

```bash
docker build -t sodax-mcp-server .
docker run -p 3000:3000 sodax-mcp-server
```

### Option 2: Docker Compose

```bash
docker-compose up -d
```

### Option 3: Direct Node.js

```bash
pnpm install
pnpm build
pnpm start
```

### Option 4: PM2 (Process Manager)

```bash
pnpm install
pnpm build
pm2 start dist/index.js --name sodax-mcp
```

### Option 5: Systemd Service

```ini
# /etc/systemd/system/sodax-mcp.service
[Unit]
Description=SODAX MCP Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/opt/sodax-mcp-server
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |
| `TRANSPORT` | `http` | Transport type (`http` or `stdio`) |
| `NODE_ENV` | - | Set to `production` for production |

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Landing page with connection instructions |
| `/api` | GET | Server info and available tools (JSON) |
| `/health` | GET | Health check |
| `/mcp` | POST | MCP protocol endpoint |

## Connecting AI Assistants

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "sodax-brand": {
      "url": "https://your-domain.com/mcp"
    },
    "sodax-docs": {
      "url": "https://docs.sodax.com/~gitbook/mcp"
    }
  }
}
```

### Cursor

Add to MCP settings:

```json
{
  "mcpServers": {
    "sodax-brand": {
      "url": "https://your-domain.com/mcp"
    },
    "sodax-docs": {
      "url": "https://docs.sodax.com/~gitbook/mcp"
    }
  }
}
```

### Local Development (stdio)

```json
{
  "mcpServers": {
    "sodax": {
      "command": "node",
      "args": ["/path/to/sodax-mcp-server/dist/index.js"],
      "env": {
        "TRANSPORT": "stdio"
      }
    }
  }
}
```

## Example Usage

Once connected, you can ask your AI assistant things like:

```
"Does this tweet align with SODAX brand voice?"
"What colors should I use for this design?"
"Review this blog post for brand alignment"
"What's our positioning statement?"
"What chains does SODAX support?"
"Show me today's trading volume"
```

The AI will automatically use the appropriate tools to fetch brand guidelines and live data.

## Development

```bash
pnpm install    # Install dependencies
pnpm dev        # Run with auto-reload
pnpm build      # Build for production
pnpm start      # Run production server
```

## Project Structure

```
sodax-mcp-server/
├── src/
│   ├── index.ts           # Server entry point
│   ├── constants.ts       # Configuration
│   ├── types.ts           # TypeScript types
│   ├── services/
│   │   ├── brandBible.ts  # Brand bible fetching/parsing
│   │   └── sodaxApi.ts    # SODAX REST API client
│   ├── tools/
│   │   ├── brandBible.ts  # Brand bible tool definitions
│   │   └── sodaxApi.ts    # SODAX API tool definitions
│   └── public/
│       └── index.html     # Landing page
├── Dockerfile
├── docker-compose.yml
└── package.json
```

## Adding New Sources

To add a new data source (e.g., SDK docs):

1. Create `src/services/sdkDocs.ts` with fetching logic
2. Create `src/tools/sdkDocs.ts` with tool definitions  
3. Register tools in `src/index.ts`

## License

MIT
