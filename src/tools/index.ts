import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';
import { registerSessionTools } from './session.js';
import { registerAccountTools } from './account.js';
import { registerPortfolioTools } from './portfolio.js';
import { registerPnlTools } from './pnl.js';
import { registerMarketDataTools } from './market-data.js';
import { registerContractTools } from './contracts.js';
import { registerOptionsTools } from './options.js';
import { registerScannerTools } from './scanner.js';
import { registerOrdersTradesTools } from './orders-trades.js';
import { registerWatchlistTools } from './watchlists.js';
import { registerCurrencyTools } from './currency.js';

export function registerAllTools(
  server: McpServer,
  client: IBClient,
  sessionManager: SessionManager,
): void {
  registerSessionTools(server, client, sessionManager);
  registerAccountTools(server, client);
  registerPortfolioTools(server, client);
  registerPnlTools(server, client);
  registerMarketDataTools(server, client);
  registerContractTools(server, client);
  registerOptionsTools(server, client);
  registerScannerTools(server, client);
  registerOrdersTradesTools(server, client);
  registerWatchlistTools(server, client);
  registerCurrencyTools(server, client);
}
