<p align="center">
  <img src="https://img.shields.io/badge/MCP-Interactive%20Brokers-red?style=for-the-badge" alt="IBKR MCP">
  <br>
  <strong>ibkr-mcp</strong>
</p>

<p align="center">
  An MCP server that gives AI assistants real-time access to your Interactive Brokers account via the Client Portal Web API — with smart session management that doesn't kick you off your phone.
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> &bull;
  <a href="#tools">26 Tools</a> &bull;
  <a href="#smart-session-management">Smart Sessions</a> &bull;
  <a href="#configuration">Config</a>
</p>

---

## What is this?

**ibkr-mcp** connects Claude (or any MCP-compatible AI) directly to your Interactive Brokers account through the **Client Portal Web API**. It features a smart two-tier session design that lets you query your portfolio without disrupting your phone or TWS sessions.

```
You: "What's my portfolio P&L today?"

Claude: Your account U1234567 is up $1,247.30 today.
        Top winners: AAPL (+$523), NVDA (+$312)
        Net liquidation: $284,521.00
```

```
You: "Get me the AAPL option chain for next month"

Claude: AAPL option chain (nearest expiration):
        Call strikes: 170, 175, 180, 185, 190, 195, 200
        Put strikes:  170, 175, 180, 185, 190, 195, 200
        42 option contracts found
```

## Smart Session Management

IB only allows one "brokerage session" per username. This MCP handles it intelligently:

| Tier | Endpoints | Conflicts with phone? | Tools |
|------|-----------|----------------------|-------|
| **Read-only** | `/portfolio/*`, `/pa/*`, `/trsrv/*`, `/iserver/secdef/*` | **Never** | Positions, account summary, allocation, contract search, option chains |
| **Brokerage** | `/iserver/marketdata/*`, `/iserver/account/orders`, etc. | **Temporarily** | Market data, P&L, orders, trades, scanner |

**How it works:**
1. MCP starts in **read-only mode** — portfolio, positions, contracts all work without touching your phone session
2. When you ask for market data or orders, it **auto-acquires** the brokerage session
3. After **2 minutes of idle**, it **auto-releases** the session — your phone can reconnect automatically
4. No manual intervention needed

## Features

- **26 read-only tools** — portfolio, deep market data, options, orders, scanner, watchlists, FX
- **Zero dependencies** beyond `@modelcontextprotocol/sdk` and `zod` — uses Node.js native `fetch()`
- **Auto-starts the Client Portal Gateway** on launch (just drop `clientportal.gw/` in the repo)
- **Self-signed cert handling** — works out of the box with IB's default SSL
- **Real error messages** — surfaces actual errors (ECONNRESET, ECONNREFUSED) not generic failures
- **Rate limiting** — per-endpoint sliding window that waits instead of erroring
- **Snapshot warmup** — auto-retries on IB's first-call empty response

## Quick Start

### Prerequisites

- [Client Portal Gateway](https://www.interactivebrokers.com/en/trading/ib-api.php) (download, extract to `clientportal.gw/` in this repo)
- Node.js 18+
- Java Runtime Environment (for the gateway)

### Install & Build

```bash
git clone https://github.com/yigitabi5444/yigit_ibkr_mcp.git
cd yigit_ibkr_mcp
npm install
npm run build
```

### Setup Client Portal Gateway

1. Download the [Client Portal Gateway](https://download2.interactivebrokers.com/portal/clientportal.gw.zip)
2. Extract to `clientportal.gw/` inside this repo (it's gitignored)
3. The MCP will auto-start it on launch
4. First time: open `https://localhost:5000/` in your browser and login

### Add to Claude Desktop

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

## Tools

### Read-Only Tier (never conflicts with phone)

| Tool | Description |
|------|-------------|
| `get_accounts` | List all brokerage accounts |
| `get_account_summary` | Balances, margin, buying power, net liquidation, cash by currency |
| `get_account_allocation` | Asset class breakdown (stocks, options, futures, cash %) |
| `get_positions` | All positions with P&L. Auto-paginates. Options include strike/right/expiry |
| `get_position_by_conid` | Single position by contract ID |
| `get_performance` | Historical NAV and time-weighted returns |
| `get_transaction_history` | Transaction log with filters |
| `search_contracts` | Search by symbol or company name |
| `get_contract_details` | Full contract specs (trading hours, tick size, exchanges) |
| `get_stock_contracts` | Stock contracts across exchanges |
| `get_futures_contracts` | Non-expired futures by underlying |
| `get_option_chain` | Full option chain (composite: strikes + conids in one call) |
| `get_option_strikes` | Strike prices for a specific expiration |

### Brokerage Tier (auto-acquires, auto-releases after 2min idle)

| Tool | Description |
|------|-------------|
| `get_market_snapshot` | Quote + P/E, EPS, div yield, market cap, 52wk, IV — 27 fields |
| `get_price_history` | Historical OHLCV bars (1min to monthly, up to 5 years) |
| `get_pnl` | Account-level daily P&L, unrealized P&L, net liquidity |
| `get_live_orders` | All currently working orders |
| `get_order_status` | Single order status |
| `get_trades` | Execution history (7 days) |
| `get_scanner_params` | Available scanner types and filters (cached 15min) |
| `run_scanner` | Market scanner (top gainers, most active, etc.) |
| `get_watchlists` | Saved watchlists |
| `get_watchlist` | Contracts in a watchlist |
| `get_exchange_rate` | FX rates |

### Session Management

| Tool | Description |
|------|-------------|
| `get_auth_status` | Check gateway authentication state |
| `reauthenticate` | Trigger re-authentication |
| `ping_session` | Manual keepalive |

## Configuration

| Environment Variable | Default | Description |
|---------------------|---------|-------------|
| `IBKR_GATEWAY_URL` | `https://localhost:5000` | Client Portal Gateway URL |
| `IBKR_ACCOUNT_ID` | *(auto-detected)* | Default account ID |
| `IBKR_TIMEOUT_MS` | `15000` | Request timeout in ms |
| `IBKR_BROKERAGE_TIMEOUT_MS` | `120000` (2min) | Idle time before releasing brokerage session |

## Architecture

```
┌─────────────────┐     stdio      ┌──────────────────────────────────┐
│  Claude Desktop  │ ◄────────────► │           ibkr-mcp                │
│  (MCP Client)    │                │                                  │
└─────────────────┘                │  IBClient ──────► CP Gateway :5000
                                    │    │                    │
                                    │  RateLimiter            │ HTTPS
                                    │    │                    │ (self-signed)
                                    │  SessionManager         │
                                    │    │                    ▼
                                    │    ├─ Read-only:     /portfolio/*
                                    │    │  (no tickle)    /pa/*, /trsrv/*
                                    │    │
                                    │    └─ Brokerage:     /iserver/*
                                    │       (tickle 55s)   (auto-release
                                    │                       after 2min idle)
                                    │                                  │
                                    │  GatewayLauncher                 │
                                    │    (auto-starts clientportal.gw) │
                                    │                                  │
                                    │  26 Read-Only MCP Tools          │
                                    └──────────────────────────────────┘
```

## Development

```bash
npm run dev          # Run with tsx (hot reload)
npm test             # Unit tests (32 tests, mocked, no gateway needed)
npm run test:integration  # Integration tests (requires live CP Gateway)
```

### Running Integration Tests

```bash
IBKR_GATEWAY_URL=https://localhost:5000 npm run test:integration
```

## License

MIT

---

<p align="center">
  Built with the <a href="https://modelcontextprotocol.io">Model Context Protocol</a>
</p>
