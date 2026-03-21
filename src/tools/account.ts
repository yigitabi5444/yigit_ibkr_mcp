import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';

export function registerAccountTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_accounts', {
    title: 'Get Accounts',
    description: 'List all brokerage accounts. Returns account IDs that can be used with other tools.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const accounts = await conn.ib.getManagedAccounts();
      return { content: [{ type: 'text', text: JSON.stringify({ accounts }, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_account_summary', {
    title: 'Get Account Summary',
    description: 'Get comprehensive account summary: balances, margin requirements, buying power, net liquidation value, and cash breakdown by currency.',
    inputSchema: {
      accountId: z.string().optional().describe('Account ID. Uses default account if omitted.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ accountId }) => {
    try {
      const tags = [
        'AccountType', 'NetLiquidation', 'TotalCashValue', 'SettledCash',
        'AccruedCash', 'BuyingPower', 'EquityWithLoanValue', 'PreviousEquityWithLoanValue',
        'GrossPositionValue', 'RegTEquity', 'RegTMargin', 'SMA',
        'InitMarginReq', 'MaintMarginReq', 'AvailableFunds', 'ExcessLiquidity',
        'Cushion', 'FullInitMarginReq', 'FullMaintMarginReq', 'FullAvailableFunds',
        'FullExcessLiquidity', 'LookAheadNextChange', 'LookAheadInitMarginReq',
        'LookAheadMaintMarginReq', 'LookAheadAvailableFunds', 'LookAheadExcessLiquidity',
        'HighestSeverity', 'DayTradesRemaining', 'Leverage',
        'Currency',
      ].join(',');

      const summary = await conn.subscribeFirst(
        conn.ib.getAccountSummary('All', tags),
      );

      // AccountSummariesUpdate.all is ReadonlyMap<AccountId, ReadonlyMap<TagName, ReadonlyMap<Currency, { value, ingressTm }>>>
      const id = accountId || await conn.getAccountId();
      const result: Record<string, unknown> = { accountId: id };

      if (summary?.all) {
        for (const [acct, tagValues] of summary.all) {
          if (accountId && acct !== accountId) continue;
          result.accountId = acct;
          for (const [tag, currencyValues] of tagValues) {
            // Take the first currency value (usually BASE or USD)
            const firstVal = currencyValues.values().next().value;
            if (firstVal) {
              result[tag] = firstVal.value;
            }
          }
        }
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
