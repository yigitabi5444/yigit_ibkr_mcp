<p align="center">
  <img src="https://img.shields.io/badge/MCP-Interactive%20Brokers-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiAyMGMtNC40MiAwLTgtMy41OC04LThzMy41OC04IDgtOCA4IDMuNTggOCA4LTMuNTggOC04IDh6Ii8+PC9zdmc+" alt="IBKR MCP">
  <br>
  <strong>ibkr-mcp</strong>
</p>

<p align="center">
  A Model Context Protocol (MCP) server that connects AI assistants to your Interactive Brokers account via the native TWS socket API.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tools">Tools</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#examples">Examples</a>
</p>

---

## What is this?

**ibkr-mcp** connects Claude (or any MCP-compatible AI) directly to your Interactive Brokers account through the **TWS socket API** (the same protocol used by IB's official Java/Python/C++ clients). No REST gateway needed — just IB Gateway or TWS running on its default port.

```
You: "What's my portfolio P&L today?"

Claude: Your account U1234567 is up $1,247.30 today.
        Top winners: AAPL (+$523), NVDA (+$312)
        Losers: TSLA (-$89)
        Net liquidation: $284,521.00
```

```
You: "Show me AAPL's option chain for next month"

Claude: Here's the AAPL option chain from SMART exchange:
        Multiplier: 100 | Expirations: 12 available

        Nearest expiration: 20250418
        Strikes: 155, 160, 165, 170, 175, 180, 185, 190, 195, 200...
        (47 strikes total)
```

## Features

- **24 read-only tools** — portfolio, market data, options, orders, news, scanner
- **Native TWS socket API** via [@stoqey/ib](https://github.com/stoqey/ib) — no REST gateway required
- **Real-time streaming data** — account summary, positions, P&L all via live subscriptions
- **Full option chains** — expirations, strikes, multiplier via `getSecDefOptParams` (fast, no throttling)
- **Historical data** — OHLCV bars from 1-minute to monthly, up to 5 years
- **News** — headlines and full articles from subscribed providers
- **Market scanner** — top gainers, most active, high dividend, and more
- **Auto-reconnect** — persistent socket connection with automatic reconnection

## Quick Start

### Prerequisites

- [IB Gateway](https://www.interactivebrokers.com/en/trading/ibgateway-stable.php) or TWS running and authenticated
- Node.js 18+

### Install & Build

```bash
git clone https://github.com/yigitabi5444/yigit_ibkr_mcp.git
cd yigit_ibkr_mcp
npm install
npm run build
```

### Add to Claude Desktop

Add this to your `claude_desktop_config.json`:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ibkr": {
      "command": "node",
      "args": ["/path/to/yigit_ibkr_mcp/dist/index.js"],
      "env": {
        "IBKR_HOST": "127.0.0.1",
        "IBKR_PORT": "4001"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the IBKR tools available.

### Port Reference

| Platform | Live | Paper |
|----------|------|-------|
| IB Gateway | 4001 | 4002 |
| TWS | 7496 | 7497 |

## Tools

### Account & Portfolio
| Tool | Description |
|------|-------------|
| `get_accounts` | List all brokerage accounts |
| `get_account_summary` | Balances, margin, buying power, net liquidation, cash breakdown |
| `get_positions` | All open positions with P&L. Options include strike/right/expiry/multiplier |
| `get_position_by_conid` | Single position detail by contract ID |

### P&L
| Tool | Description |
|------|-------------|
| `get_pnl` | Real-time account-level daily P&L, unrealized P&L, realized P&L |

### Market Data
| Tool | Description |
|------|-------------|
| `get_market_snapshot` | Real-time quote with fundamentals (P/E, EPS, div yield, market cap, 52wk, IV) |
| `get_price_history` | Historical OHLCV bars (1min to monthly, up to 5 years) |
| `get_exchange_rate` | FX rates via IDEALPRO |

### Options
| Tool | Description |
|------|-------------|
| `get_option_chain` | Full chain — expirations, strikes, multiplier, exchange. Fast (no throttling). |
| `get_option_strikes` | Strike prices filtered by expiration and exchange |

### Contracts
| Tool | Description |
|------|-------------|
| `search_contracts` | Search by symbol or company name |
| `get_contract_details` | Full specs: trading hours, min tick, valid exchanges, order types |
| `get_stock_contracts` | Stock contracts across all exchanges |
| `get_futures_contracts` | Non-expired futures by underlying |

### Scanner
| Tool | Description |
|------|-------------|
| `get_scanner_params` | Available scanner types and filters (cached 15min) |
| `run_scanner` | Run market scanner (top gainers, most active, high dividend, etc.) |

### Orders & Trades (Read-Only)
| Tool | Description |
|------|-------------|
| `get_live_orders` | All currently working orders |
| `get_order_status` | Single order status by ID |
| `get_trades` | Execution history for current session |

### News
| Tool | Description |
|------|-------------|
| `get_news_providers` | List subscribed news sources |
| `get_news_headlines` | Historical headlines by contract ID |
| `get_news_article` | Full article text by article ID |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `IBKR_HOST` | `127.0.0.1` | IB Gateway/TWS host |
| `IBKR_PORT` | `4001` | Socket API port |
| `IBKR_CLIENT_ID` | `0` | API client ID (0-32) |
| `IBKR_ACCOUNT_ID` | *(auto-detected)* | Default account ID |
| `IBKR_MARKET_DATA_TYPE` | `3` | 1=live, 2=frozen, 3=delayed, 4=delayed-frozen |
| `IBKR_TIMEOUT_MS` | `15000` | Request timeout in ms |

## Examples

Ask Claude things like:

- *"What's my current portfolio and P&L?"*
- *"Show me my P&L for today"*
- *"Look up NVDA and give me the full quote with fundamentals"*
- *"What are my option positions?"*
- *"Get the AAPL option chain — what strikes are available?"*
- *"Show me the most active stocks right now"*
- *"What trades did I execute today?"*
- *"What's the EUR/USD exchange rate?"*
- *"Get me the latest news headlines for AAPL"*

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────────────────────┐
│  Claude Desktop  │ ◄────────────► │         ibkr-mcp                 │
│  (MCP Client)    │                │                                  │
└─────────────────┘                │  ┌────────────────────────────┐  │
                                    │  │  IBConnection (singleton)   │  │
                                    │  │  ┌────────────────────────┐│  │
                                    │  │  │ IBApiNext (@stoqey/ib) ││  │    TCP socket
                                    │  │  │  - Promises (one-shot) ││  │ ◄────────────►
                                    │  │  │  - Observables (stream)││  │
                                    │  │  │  - Auto-reconnect      ││  │
                                    │  │  └────────────────────────┘│  │
                                    │  │  ┌────────────────────────┐│  │   IB Gateway
                                    │  │  │ IBApi (low-level)      ││  │   port 4001
                                    │  │  │  - News events         ││  │
                                    │  │  └────────────────────────┘│  │
                                    │  └────────────────────────────┘  │
                                    │                                  │
                                    │  24 Read-Only MCP Tools          │
                                    └──────────────────────────────────┘
```

**Key design**: The TWS API is event-driven (pub/sub over TCP socket), but MCP tools are request/response. `IBConnection` bridges this with `subscribeFirst()` — subscribe to a streaming Observable, take the first emission, auto-unsubscribe.

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Unit tests (19 tests, mocked, no gateway needed)
npm run test:integration  # Integration tests (requires live IB Gateway)
```

### Running Integration Tests

```bash
IBKR_HOST=127.0.0.1 IBKR_PORT=4001 npm run test:integration
```

## Tech Stack

- **[@stoqey/ib](https://github.com/stoqey/ib)** — TypeScript port of the official IB Java client (TWS API v10.32)
- **[RxJS](https://rxjs.dev/)** — Observable-to-Promise bridge for streaming data
- **[@modelcontextprotocol/sdk](https://modelcontextprotocol.io)** — MCP server framework
- **[Zod](https://zod.dev/)** — Input validation
- **[Vitest](https://vitest.dev/)** — Testing

## License

MIT

---

<p align="center">
  Built with the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
</p>
