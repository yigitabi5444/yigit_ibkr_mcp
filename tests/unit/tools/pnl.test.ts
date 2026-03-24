import { describe, it, expect, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createMockClient } from '../helpers/mock-client.js';
import { getToolHandler } from '../helpers/get-tool-handler.js';
import { registerPnlTools } from '../../../src/tools/pnl.js';

describe('PnL Tools', () => {
  it('get_pnl returns profit and loss data', async () => {
    const { client, sessionManager } = createMockClient();
    const pnlData = {
      upnl: { U1234567: { dpl: -250.5, upl: 1200.75, nl: 100000, el: 85000 } },
    };
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue(pnlData);

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPnlTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_pnl');
    const result = await handler({});
    const data = JSON.parse(result.content[0].text);

    expect(data.upnl.U1234567.dpl).toBe(-250.5);
    expect(data.upnl.U1234567.upl).toBe(1200.75);
    expect(data.upnl.U1234567.nl).toBe(100000);
    expect(data.upnl.U1234567.el).toBe(85000);
  });

  it('get_pnl calls ensureBrokerageSession', async () => {
    const { client, sessionManager } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPnlTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_pnl');
    await handler({});

    expect(sessionManager.ensureBrokerageSession).toHaveBeenCalledOnce();
  });

  it('get_pnl switches account when accountId provided', async () => {
    const { client, sessionManager } = createMockClient();
    (client.get as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (client.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const server = new McpServer({ name: 'test', version: '1.0' });
    registerPnlTools(server, client, sessionManager);

    const handler = getToolHandler(server, 'get_pnl');
    await handler({ accountId: 'U9999999' });

    expect(client.post).toHaveBeenCalledWith('/iserver/account', { acctId: 'U9999999' });
  });
});
