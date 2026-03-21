import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IBClient } from '../client/ib-client.js';
import { SessionManager } from '../client/session-manager.js';

export function registerSessionTools(server: McpServer, client: IBClient, sessionManager: SessionManager): void {
  server.registerTool('get_auth_status', {
    title: 'Get Auth Status',
    description: 'Check if the IB Gateway session is authenticated and ready for API calls. Returns authentication state, competing session info, and connection status.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const status = await sessionManager.checkAuthStatus();
      return { content: [{ type: 'text', text: JSON.stringify(status, null, 2) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('reauthenticate', {
    title: 'Reauthenticate',
    description: 'Re-authenticate the IB Gateway brokerage session. Use when session has expired or auth status shows not authenticated.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      const success = await sessionManager.reauthenticate();
      const status = await sessionManager.checkAuthStatus();
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({ success, ...status }, null, 2),
        }],
      };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });

  server.registerTool('ping_session', {
    title: 'Ping Session',
    description: 'Manually ping (tickle) the IB Gateway to keep the session alive. The server auto-tickles every 55 seconds, but this can be used for manual keepalive.',
    annotations: { readOnlyHint: true },
  }, async () => {
    try {
      await sessionManager.tickle();
      return { content: [{ type: 'text', text: JSON.stringify({ success: true, message: 'Session pinged successfully' }) }] };
    } catch (error) {
      return { content: [{ type: 'text', text: `Error: ${(error as Error).message}` }], isError: true };
    }
  });
}
