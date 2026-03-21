import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';
import { registerAccountTools } from './account.js';
import { registerPortfolioTools } from './portfolio.js';
import { registerPnlTools } from './pnl.js';
import { registerMarketDataTools } from './market-data.js';
import { registerContractTools } from './contracts.js';
import { registerOptionsTools } from './options.js';
import { registerScannerTools } from './scanner.js';
import { registerOrdersTradesTools } from './orders-trades.js';
import { registerNewsTools } from './news.js';

export function registerAllTools(server: McpServer, conn: IBConnection): void {
  registerAccountTools(server, conn);
  registerPortfolioTools(server, conn);
  registerPnlTools(server, conn);
  registerMarketDataTools(server, conn);
  registerContractTools(server, conn);
  registerOptionsTools(server, conn);
  registerScannerTools(server, conn);
  registerOrdersTradesTools(server, conn);
  registerNewsTools(server, conn);
}
