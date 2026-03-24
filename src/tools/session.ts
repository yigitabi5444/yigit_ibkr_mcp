import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

export function registerSessionTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_auth_status', {
    title: 'Get Auth Status',
    description: 'Check if the Client Portal Gateway is authenticated. Returns auth state, competing session flag, and connection status.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const status = await sessionManager.checkAuth();
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('reauthenticate', {
    title: 'Reauthenticate',
    description: 'Trigger re-authentication of the Client Portal Gateway session.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const data = await client.post('/iserver/reauthenticate');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('ping_session', {
    title: 'Ping Session',
    description: 'Send a tickle/keepalive to the Client Portal Gateway. Returns session token and competing flag.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const data = await client.post('/tickle');
      return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
