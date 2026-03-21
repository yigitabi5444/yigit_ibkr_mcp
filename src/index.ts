#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { RateLimiter } from './client/rate-limiter.js';
import { IBClient } from './client/ib-client.js';
import { SessionManager } from './client/session-manager.js';
import { registerAllTools } from './tools/index.js';

async function main(): Promise<void> {
  const config = loadConfig();
  const rateLimiter = new RateLimiter();
  const client = new IBClient(config, rateLimiter);
  const sessionManager = new SessionManager(client, config.tickleIntervalMs);

  const server = new McpServer({
    name: 'ibkr-mcp',
    version: '1.0.0',
  });

  registerAllTools(server, client, sessionManager);

  // Start session manager (auto-tickle loop)
  await sessionManager.start();

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Graceful shutdown
  const shutdown = () => {
    sessionManager.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
