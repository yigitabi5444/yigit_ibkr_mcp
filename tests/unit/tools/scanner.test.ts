import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';

// The scanner module caches at module scope, so we need a fresh import for the caching test
// We re-import to reset the module-level cache between tests
let registerScannerTools: typeof import('../../../src/tools/scanner.js').registerScannerTools;

beforeEach(async () => {
  vi.resetModules();
  const mod = await import('../../../src/tools/scanner.js');
  registerScannerTools = mod.registerScannerTools;
});

describe('Scanner Tools', () => {
  it('get_scanner_params returns params and caches on second call', async () => {
    const { client, sessionManager } = createMockClient();
    const scannerParams = {
      instrument_list: [{ name: 'US Stocks', type: 'STK' }],
      scan_type_list: [{ name: 'Top % Gainers', code: 'TOP_PERC_GAIN' }],
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(scannerParams);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerScannerTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_scanner_params');

    // First call: hits the API
    const result1 = await handler({});
    const data1 = JSON.parse(result1.content[0].text);
    expect(data1.instrument_list).toHaveLength(1);

    // Second call: should use cache, not call client.get again
    const result2 = await handler({});
    const data2 = JSON.parse(result2.content[0].text);
    expect(data2.instrument_list).toHaveLength(1);

    // client.get should have been called only once (cached on second call)
    expect(client.get).toHaveBeenCalledTimes(1);
  });

  it('run_scanner posts scanner config and returns results', async () => {
    const { client, sessionManager } = createMockClient();
    const scanResults = [
      { conid: 265598, symbol: 'AAPL', changePercent: 5.2 },
      { conid: 272093, symbol: 'MSFT', changePercent: 3.8 },
    ];
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue(scanResults);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerScannerTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'run_scanner');
    const result = await handler({
      instrument: 'STK',
      location: 'STK.US.MAJOR',
      type: 'TOP_PERC_GAIN',
    });
    const data = JSON.parse(result.content[0].text);

    expect(data).toHaveLength(2);
    expect(data[0].symbol).toBe('AAPL');
    expect(sessionManager.ensureBrokerageSession).toHaveBeenCalled();
    expect(client.post).toHaveBeenCalledWith('/iserver/scanner/run', {
      instrument: 'STK',
      location: 'STK.US.MAJOR',
      type: 'TOP_PERC_GAIN',
    });
  });

  it('run_scanner passes optional filters', async () => {
    const { client, sessionManager } = createMockClient();
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerScannerTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'run_scanner');
    const filters = [{ code: 'priceAbove', value: 10 }];
    await handler({
      instrument: 'STK',
      location: 'STK.US.MAJOR',
      type: 'MOST_ACTIVE',
      filters,
    });

    expect(client.post).toHaveBeenCalledWith('/iserver/scanner/run', {
      instrument: 'STK',
      location: 'STK.US.MAJOR',
      type: 'MOST_ACTIVE',
      filter: filters,
    });
  });
});
