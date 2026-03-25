<p align="center">
  <img src="https://img.shields.io/badge/MCP-Interactive%20Brokers-red?style=for-the-badge" alt="IBKR MCP">
  <br>
  <strong>ibkr-mcp</strong>
</p>

<p align="center">
  An MCP server that gives AI assistants real-time access to your Interactive Brokers account via the Client Portal Web API.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tools">Tools</a> &bull;
  <a href="#ibeam-setup">IBeam Setup</a> &bull;
  <a href="#configuration">Config</a>
</p>

---

## What is this?

**ibkr-mcp** connects Claude (or any MCP-compatible AI) directly to your Interactive Brokers account through the **Client Portal Web API**. It's a thin, stateless wrapper — no session management, no gateway lifecycle, no tickling. Just tools that call the API.

Gateway authentication and session management is handled externally by [IBeam](https://github.com/Voyz/ibeam), which runs in Docker and handles login automation + 2FA.

```
You: "What's my portfolio P&L today?"

Claude: Your account U1234567 is up $1,247.30 today.
        Top winners: AAPL (+$523), NVDA (+$312)
        Net liquidation: $284,521.00
```

## Features

- **26 read-only tools** — portfolio, market data, options, orders, scanner, watchlists, news, FX
- **Stateless** — no session management, no tickling, no gateway lifecycle. IBeam handles all of that.
- **Human-readable market data** — snapshot fields mapped to names like `lastPrice`, `week52High`, `sector`
- **Zero dependencies** beyond `@modelcontextprotocol/sdk` and `zod`
- **Rate limiting** — per-endpoint sliding window that waits instead of erroring
- **Snapshot warmup** — auto-retries on IB's first-call empty response

## Quick Start

### Prerequisites

- **Node.js 18+**
- **Docker** (for IBeam)
- **IB account** with Client Portal API access

### 1. Start IBeam (Gateway + Auth)

IBeam handles the Client Portal Gateway process, browser login automation, session keepalive, and 2FA. See [IBeam Setup](#ibeam-setup) below.

```bash
docker run -d \
  --name ibeam \
  -p 5000:5000 \
  -e IBEAM_ACCOUNT=your_ib_username \
  -e IBEAM_PASSWORD=your_ib_password \
  -e IBEAM_GATEWAY_BASE_URL=https://localhost:5000 \
  voyz/ibeam
```

### 2. Install & Build MCP

```bash
git clone https://github.com/yigitabi5444/yigit_ibkr_mcp.git
cd yigit_ibkr_mcp
npm install
npm run build
```

### 3. Add to Claude Desktop

```json
{
  "mcpServers": {
    "ibkr": {
      "command": "node",
      "args": ["/path/to/yigit_ibkr_mcp/dist/index.js"],
      "env": {
        "IBKR_GATEWAY_URL": "https://localhost:5000"
      }
    }
  }
}
```

## IBeam Setup

[IBeam](https://github.com/Voyz/ibeam) is the recommended way to run the IB Client Portal Gateway. It handles:

- Starting the gateway Java process
- Automated browser login (headless Chrome + Selenium)
- 2FA handling (push notification, SMS, or custom handler)
- Session keepalive
- Automatic re-authentication on session expiry

### Basic Docker Setup

```bash
docker run -d \
  --name ibeam \
  --restart unless-stopped \
  -p 5000:5000 \
  -e IBEAM_ACCOUNT=your_username \
  -e IBEAM_PASSWORD=your_password \
  voyz/ibeam
```

### With 2FA (Push Notification)

```bash
docker run -d \
  --name ibeam \
  --restart unless-stopped \
  -p 5000:5000 \
  -e IBEAM_ACCOUNT=your_username \
  -e IBEAM_PASSWORD=your_password \
  -e IBEAM_TWO_FA_HANDLER=PUSH \
  voyz/ibeam
```

### Docker Compose

```yaml
services:
  ibeam:
    image: voyz/ibeam
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      IBEAM_ACCOUNT: ${IB_USERNAME}
      IBEAM_PASSWORD: ${IB_PASSWORD}
      IBEAM_TWO_FA_HANDLER: PUSH
```

See the [IBeam docs](https://github.com/Voyz/ibeam) for full configuration including custom 2FA handlers, health checks, and troubleshooting.

## Tools

### Account & Portfolio
| Tool | Description |
|------|-------------|
| `get_accounts` | List all brokerage accounts |
| `get_account_summary` | Curated: NLV, cash, buying power, margin, positions value, cash by currency |
| `get_account_summary_full` | Full 70+ field raw summary |
| `get_account_allocation` | Asset class breakdown (stocks, options, futures, cash %) |
| `get_positions` | All positions with P&L. Auto-paginates. Options include strike/right/expiry |
| `get_position_by_conid` | Single position by contract ID |
| `get_performance` | Historical NAV and time-weighted returns |
| `get_transaction_history` | Transaction log with filters |

### Market Data
| Tool | Description |
|------|-------------|
| `get_market_snapshot` | Real-time quote with readable names (lastPrice, bid, ask, sector, week52High, etc.) |
| `get_price_history` | Historical OHLCV bars (1min to monthly, up to 5 years) |

### Contracts
| Tool | Description |
|------|-------------|
| `search_contracts` | Search by symbol or company name |
| `get_contract_details` | Curated contract specs (trading hours, tick size, exchanges) |
| `get_stock_contracts` | Stock contracts across exchanges |
| `get_futures_contracts` | Non-expired futures by underlying |

### Options
| Tool | Description |
|------|-------------|
| `get_option_chain` | Full option chain (composite: strikes + conids in one call) |
| `get_option_strikes` | Strike prices for a specific expiration |

### Orders & Trades
| Tool | Description |
|------|-------------|
| `get_live_orders` | All currently working orders |
| `get_order_status` | Single order status |
| `get_trades` | Execution history (7 days) |

### Scanner
| Tool | Description |
|------|-------------|
| `get_scanner_params` | Available scanner types and filters (cached 15min) |
| `run_scanner` | Market scanner (top gainers, most active, etc.) |

### Other
| Tool | Description |
|------|-------------|
| `get_watchlists` / `get_watchlist` | Saved watchlists |
| `get_exchange_rate` | FX rates |
| `get_news_sources` | Available news providers |
| `get_news_briefing` | Market briefing from Briefing.com |
| `get_auth_status` / `reauthenticate` / `ping_session` | Session diagnostics |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `IBKR_GATEWAY_URL` | `https://localhost:5001` | Client Portal Gateway URL (IBeam default: 5000) |
| `IBKR_ACCOUNT_ID` | *(auto-detected)* | Default account ID |
| `IBKR_TIMEOUT_MS` | `15000` | Request timeout in ms |

## Architecture

```
┌─────────────────┐     stdio      ┌────────────────┐     HTTPS      ┌─────────────┐
│  Claude Desktop  │ ◄────────────► │    ibkr-mcp    │ ────────────► │   IBeam     │
│  (MCP Client)    │                │  (stateless)   │               │  (Docker)   │
└─────────────────┘                │                │               │             │
                                    │  IBClient      │               │  CP Gateway │
                                    │  RateLimiter   │               │  Selenium   │
                                    │  26 Tools      │               │  Keepalive  │
                                    └────────────────┘               └─────────────┘
```

The MCP is intentionally thin — it just makes HTTP calls. IBeam owns the gateway process, authentication, session keepalive, and 2FA.

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Unit tests (27 tests, mocked, no gateway needed)
npm run test:integration  # Integration tests (requires live gateway)
```

```bash
IBKR_GATEWAY_URL=https://localhost:5000 npm run test:integration
```

## License

MIT

---

<p align="center">
  Built with the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
</p>
