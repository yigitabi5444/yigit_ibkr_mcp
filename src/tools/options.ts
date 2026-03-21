import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';

interface StrikesResponse {
  call?: number[];
  put?: number[];
}

interface SecDefInfoItem {
  conid?: number;
  strike?: number;
  right?: string;
  month?: string;
  [key: string]: unknown;
}

export function registerOptionsTools(server: McpServer, client: IBClient): void {
  server.registerTool('get_option_chain', {
    title: 'Get Option Chain',
    description: 'Get the full option chain for an underlying security. This is a composite tool that orchestrates multiple API calls: (1) fetches available expirations, (2) fetches strike prices for the selected month, (3) fetches individual option contract details (conids) for each strike. Returns structured data with expirations, strikes, and put/call conids. Use the returned conids with get_market_snapshot to get IV, greeks, and pricing.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security (e.g. AAPL stock conid)'),
      month: z.string().optional().describe('Expiration month filter (e.g. "JAN25", "FEB25"). If omitted, returns the nearest expiration.'),
      exchange: z.string().optional().describe('Exchange filter (e.g. "SMART")'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, month, exchange }) => {
    try {
      // Step 1: Get available option expirations via secdef/search or strikes
      const strikesParams: Record<string, string | number | boolean | undefined> = {
        conid,
        sectype: 'OPT',
      };
      if (month) strikesParams.month = month;
      if (exchange) strikesParams.exchange = exchange;

      const strikes = await client.get<StrikesResponse>('/iserver/secdef/strikes', strikesParams);

      if (!strikes || (!strikes.call?.length && !strikes.put?.length)) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              message: 'No option strikes found. Try specifying a different month or check the conid.',
              params: strikesParams,
            }, null, 2),
          }],
        };
      }

      // Step 2: For each strike, get the option contract details
      const allStrikes = new Set([...(strikes.call || []), ...(strikes.put || [])]);
      const optionContracts: SecDefInfoItem[] = [];

      // Fetch option conids for calls and puts
      for (const right of ['C', 'P'] as const) {
        for (const strike of allStrikes) {
          try {
            const info = await client.get<SecDefInfoItem[]>('/iserver/secdef/info', {
              conid,
              sectype: 'OPT',
              month: month || '',
              strike,
              right,
            });
            if (Array.isArray(info)) {
              optionContracts.push(...info);
            }
          } catch {
            // Skip individual failures
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            underlying_conid: conid,
            month: month || 'nearest',
            strikes: {
              call: strikes.call || [],
              put: strikes.put || [],
            },
            contracts: optionContracts,
            total_contracts: optionContracts.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_option_strikes', {
    title: 'Get Option Strikes',
    description: 'Get available strike prices for options on an underlying security for a specific expiration month. Returns separate lists of call and put strikes.',
    inputSchema: {
      conid: z.number().describe('Contract ID of the underlying security'),
      month: z.string().describe('Expiration month (e.g. "JAN25", "FEB25")'),
      exchange: z.string().optional().describe('Exchange filter'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid, month, exchange }) => {
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        conid,
        sectype: 'OPT',
        month,
      };
      if (exchange) params.exchange = exchange;

      const data = await client.get('/iserver/secdef/strikes', params);
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
