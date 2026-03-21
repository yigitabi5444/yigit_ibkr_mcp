import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBConnection } from '../connection.js';
import { Contract, SecType, Stock } from '@stoqey/ib';

export function registerContractTools(server: McpServer, conn: IBConnection): void {
  server.registerTool('search_contracts', {
    title: 'Search Contracts',
    description: 'Search for securities by symbol or company name. Returns contract IDs (conids), symbol, exchange, security type, and description. Use the returned conid with other tools.',
    inputSchema: {
      symbol: z.string().describe('Symbol or company name to search for'),
      secType: z.string().optional().describe('Security type filter (STK, OPT, FUT, CASH, IND, etc.)'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbol, secType }) => {
    try {
      const results = await conn.ib.getMatchingSymbols(symbol);
      let contracts = results.map((r) => ({
        conId: r.contract?.conId,
        symbol: r.contract?.symbol,
        secType: r.contract?.secType,
        exchange: r.contract?.primaryExch || r.contract?.exchange,
        currency: r.contract?.currency,
        derivativeSecTypes: r.derivativeSecTypes,
      }));

      if (secType) {
        contracts = contracts.filter((c) => c.secType === secType);
      }

      return { content: [{ type: 'text', text: JSON.stringify(contracts, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_contract_details', {
    title: 'Get Contract Details',
    description: 'Get full contract details for a known contract ID (conid). Returns exchange, currency, trading hours, min tick size, order types, and other contract specifications.',
    inputSchema: {
      conid: z.number().describe('Contract ID'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ conid }) => {
    try {
      const contract: Contract = { conId: conid } as Contract;
      const details = await conn.ib.getContractDetails(contract);

      const result = details.map((d) => ({
        conId: d.contract?.conId,
        symbol: d.contract?.symbol,
        secType: d.contract?.secType,
        exchange: d.contract?.exchange,
        primaryExch: d.contract?.primaryExch,
        currency: d.contract?.currency,
        localSymbol: d.contract?.localSymbol,
        longName: d.longName,
        category: d.category,
        subcategory: d.subcategory,
        minTick: d.minTick,
        priceMagnifier: d.priceMagnifier,
        tradingHours: d.tradingHours,
        liquidHours: d.liquidHours,
        validExchanges: d.validExchanges,
        orderTypes: d.orderTypes,
        marketName: d.marketName,
        contractMonth: d.contractMonth,
        industry: d.industry,
        stockType: d.stockType,
      }));

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_stock_contracts', {
    title: 'Get Stock Contracts',
    description: 'Look up stock contracts by symbol across all exchanges. Returns available contract variants with exchange and conid.',
    inputSchema: {
      symbols: z.array(z.string()).min(1).max(10).describe('Array of stock symbols (e.g. ["AAPL", "MSFT"])'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbols }) => {
    try {
      const result: Record<string, unknown[]> = {};

      for (const sym of symbols) {
        const contract = new Stock(sym);
        const details = await conn.ib.getContractDetails(contract);
        result[sym] = details.map((d) => ({
          conId: d.contract?.conId,
          exchange: d.contract?.exchange,
          primaryExch: d.contract?.primaryExch,
          currency: d.contract?.currency,
          longName: d.longName,
        }));
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('get_futures_contracts', {
    title: 'Get Futures Contracts',
    description: 'Look up non-expired futures contracts by underlying symbol.',
    inputSchema: {
      symbols: z.array(z.string()).min(1).max(10).describe('Array of underlying symbols (e.g. ["ES", "NQ"])'),
    },
    annotations: { readOnlyHint: true },
  }, async ({ symbols }) => {
    try {
      const result: Record<string, unknown[]> = {};

      for (const sym of symbols) {
        const contract: Contract = {
          symbol: sym,
          secType: SecType.FUT,
        } as Contract;
        const details = await conn.ib.getContractDetails(contract);
        result[sym] = details.map((d) => ({
          conId: d.contract?.conId,
          symbol: d.contract?.symbol,
          localSymbol: d.contract?.localSymbol,
          exchange: d.contract?.exchange,
          currency: d.contract?.currency,
          lastTradeDateOrContractMonth: d.contract?.lastTradeDateOrContractMonth,
          multiplier: d.contract?.multiplier,
          longName: d.longName,
        }));
      }

      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
