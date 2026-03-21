import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';
import { SecType } from '@stoqey/ib';

export function registerOptionsTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('get_option_chain', {
    title: 'Get Option Chain',
    description: 'Get the full option chain for an underlying security. Returns available expirations, strikes, exchange, and multiplier. Use getSecDefOptParams which is much faster than reqContractDetails for options.',
    inputSchema: {
      symbol: z.string().describe('Underlying symbol (e.g. "AAPL")'),
      conid: z.number().describe('Contract ID of the underlying security'),
      exchange: z.string().optional().describe('Exchange filter. If omitted, returns all exchanges.'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbol, conid, exchange }) => {
    try {
      const params = await conn.ib.getSecDefOptParams(
        symbol,
        '',              // futFopExchange: empty for stocks
        SecType.STK,     // underlying sec type
        conid,
      );

      let results = params;
      if (exchange) {
        results = params.filter((p: { exchange: string }) => p.exchange === exchange);
      }

      const formatted = results.map((p) => ({
        exchange: p.exchange,
        underlyingConId: p.underlyingConId,
        tradingClass: p.tradingClass,
        multiplier: p.multiplier,
        expirations: [...p.expirations].sort(),
        strikes: [...p.strikes].sort((a, b) => a - b),
      }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            underlying: symbol,
            underlying_conid: conid,
            chains: formatted,
            total_chains: formatted.length,
          }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_option_strikes', {
    title: 'Get Option Strikes',
    description: 'Get available strike prices for options on an underlying security. Filters the option chain params by exchange and expiration.',
    inputSchema: {
      symbol: z.string().describe('Underlying symbol'),
      conid: z.number().describe('Contract ID of the underlying security'),
      exchange: z.string().optional().describe('Exchange filter (e.g. "SMART")'),
      expiration: z.string().optional().describe('Filter by expiration date (YYYYMMDD format)'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbol, conid, exchange, expiration }) => {
    try {
      const params = await conn.ib.getSecDefOptParams(
        symbol,
        '',
        SecType.STK,
        conid,
      );

      let filtered = params;
      if (exchange) {
        filtered = filtered.filter((p) => p.exchange === exchange);
      }

      const result = filtered.map((p) => {
        const expirations = [...p.expirations];
        const strikes = [...p.strikes].sort((a, b) => a - b);

        if (expiration) {
          const hasExpiry = expirations.includes(expiration);
          return {
            exchange: p.exchange,
            expiration: hasExpiry ? expiration : 'not found',
            strikes: hasExpiry ? strikes : [],
          };
        }

        return {
          exchange: p.exchange,
          expirations: expirations.sort(),
          strikes,
        };
      });

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
