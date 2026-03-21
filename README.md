<p align="center">
  <img src="https://img.shields.io/badge/MCP-Interactive%20Brokers-red?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0id2hpdGUiPjxwYXRoIGQ9Ik0xMiAyQzYuNDggMiAyIDYuNDggMiAxMnM0LjQ4IDEwIDEwIDEwIDEwLTQuNDggMTAtMTBTMTcuNTIgMiAxMiAyek0xMiAyMGMtNC40MiAwLTgtMy41OC04LThzMy41OC04IDgtOCA4IDMuNTggOCA4LTMuNTggOC04IDh6Ii8+PC9zdmc+" alt="IBKR MCP">
  <br>
  <strong>ibkr-mcp</strong>
</p>

<p align="center">
  A Model Context Protocol (MCP) server that gives AI assistants real-time access to your Interactive Brokers portfolio, market data, and trading analytics.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tools">Tools</a> &bull;
  <a href="#configuration">Configuration</a> &bull;
  <a href="#examples">Examples</a>
</p>

---

## What is this?

**ibkr-mcp** connects Claude (or any MCP-compatible AI) directly to your Interactive Brokers account through the IB Gateway Client Portal API. Ask questions about your portfolio in natural language and get real answers from real data.

```
You: "What's my portfolio P&L today?"

Claude: Your account U1234567 is up $1,247.30 today.
        Top winners: AAPL (+$523), NVDA (+$312)
        Losers: TSLA (-$89)
        Net liquidation: $284,521.00
```

```
You: "Show me AAPL's option chain for next month, focus on strikes near the money"

Claude: Here's the AAPL option chain for APR25:
        Current price: $178.52 | IV: 28.4%

        Strike  Call Bid/Ask    Put Bid/Ask
        175     $5.20/$5.40     $1.65/$1.80
        177.5   $3.80/$4.00     $2.75/$2.90
        180     $2.60/$2.75     $4.05/$4.20
        182.5   $1.55/$1.70     $5.50/$5.65
```

## Features

- **26 read-only tools** covering every aspect of your IB account
- **Deep market data** with fundamentals (P/E, EPS, dividend yield, market cap, 52-week range, IV)
- **Full option chains** with strike prices and contract details in a single call
- **Per-position P&L** including unrealized gains, daily changes, and cost basis
- **Auto-session management** — keeps your IB Gateway session alive automatically
- **Rate limiting** built-in so you never hit IB's API limits
- **Self-signed cert handling** — works with IB Gateway's default SSL setup

## Quick Start

### Prerequisites

- [IB Gateway](https://www.interactivebrokers.com/en/trading/ibgateway-stable.php) running and authenticated
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
        "IBKR_GATEWAY_URL": "https://localhost:4001"
      }
    }
  }
}
```

Restart Claude Desktop. You should see the IBKR tools available.

## Tools

### Account & Portfolio
| Tool | Description |
|------|-------------|
| `get_accounts` | List all brokerage accounts |
| `get_account_summary` | Balances, margin, buying power, net liquidation, cash by currency |
| `get_account_allocation` | Asset class breakdown (stocks, options, futures, cash %) |
| `get_positions` | All open positions with unrealized P&L, daily P&L. Auto-paginates. Includes option positions with strike/right/expiry |
| `get_position_by_conid` | Single position detail by contract ID |

### P&L & Performance
| Tool | Description |
|------|-------------|
| `get_pnl` | Account-level daily P&L, unrealized P&L, net liquidity |
| `get_performance` | Historical NAV and time-weighted returns |
| `get_transaction_history` | Transaction log with filters |

### Market Data (Deep)
| Tool | Description |
|------|-------------|
| `get_market_snapshot` | Real-time quote + **P/E, EPS, dividend yield, market cap, 52-week high/low, IV** — all in one call |
| `get_price_history` | Historical OHLCV bars (1min to monthly, up to 5 years) |

### Options
| Tool | Description |
|------|-------------|
| `get_option_chain` | Full option chain — fetches expirations, strikes, and contract IDs in one composite call |
| `get_option_strikes` | Strike prices for a specific expiration |

### Contracts
| Tool | Description |
|------|-------------|
| `search_contracts` | Search by symbol or company name |
| `get_contract_details` | Full contract specifications |
| `get_contract_rules` | Trading rules, order types, increments |
| `get_stock_contracts` | Stock contracts across exchanges |
| `get_futures_contracts` | Futures contracts by underlying |

### Scanner
| Tool | Description |
|------|-------------|
| `get_scanner_params` | Available scanner types and filters |
| `run_scanner` | Run market scanner (top gainers, most active, etc.) |

### Orders & Trades (Read-Only)
| Tool | Description |
|------|-------------|
| `get_live_orders` | Currently working orders |
| `get_order_status` | Single order status |
| `get_trades` | Execution history (7 days) |

### Other
| Tool | Description |
|------|-------------|
| `get_watchlists` / `get_watchlist` | Saved watchlists |
| `get_exchange_rate` | FX rates |
| `get_auth_status` / `reauthenticate` / `ping_session` | Session management |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `IBKR_GATEWAY_URL` | `https://localhost:4001` | IB Gateway address |
| `IBKR_ACCOUNT_ID` | *(auto-detected)* | Default account ID |
| `IBKR_SSL_VERIFY` | `false` | SSL certificate verification |
| `IBKR_TIMEOUT_MS` | `15000` | Request timeout in ms |

## Examples

Ask Claude things like:

- *"What's my current portfolio allocation?"*
- *"Show me my P&L for today"*
- *"Look up NVDA and give me the full quote with fundamentals"*
- *"What are my option positions?"*
- *"Get the TSLA option chain for next month"*
- *"Show me the most active stocks right now"*
- *"What trades did I make this week?"*
- *"What's the EUR/USD exchange rate?"*

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────┐     HTTPS     ┌─────────────┐
│  Claude Desktop  │ ◄────────────► │    ibkr-mcp      │ ◄───────────► │ IB Gateway  │
│  (MCP Client)    │                │                  │               │ (port 4001) │
└─────────────────┘                │  ┌────────────┐  │               └─────────────┘
                                    │  │ 26 Tools   │  │
                                    │  ├────────────┤  │
                                    │  │ Rate       │  │
                                    │  │ Limiter    │  │
                                    │  ├────────────┤  │
                                    │  │ Session    │  │
                                    │  │ Manager    │  │
                                    │  │ (auto-     │  │
                                    │  │  tickle)   │  │
                                    │  └────────────┘  │
                                    └──────────────────┘
```

- **Session Manager** auto-tickles every 55s to prevent timeout, handles re-auth on 401
- **Rate Limiter** per-endpoint sliding window — waits instead of erroring
- **Self-signed certs** handled natively via Node.js `https` module

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Unit tests (33 tests, no gateway needed)
npm run test:integration  # Integration tests (requires live IB Gateway)
```

## License

MIT

---

<p align="center">
  Built with the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
</p>
