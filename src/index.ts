#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { loadConfig } from './config.js';
import { IBClient } from './client/ib-client.js';
import { RateLimiter } from './client/rate-limiter.js';
import { SessionManager } from './client/session-manager.js';
import { GatewayLauncher } from './client/gateway-launcher.js';
import { registerAllTools } from './tools/index.js';

async function main(): Promise<void> {
  const config = loadConfig();

  // Auto-start Client Portal Gateway
  const launcher = new GatewayLauncher(config.gatewayUrl);
  await launcher.start();

  const rateLimiter = new RateLimiter();
  const client = new IBClient(config);
  const sessionManager = new SessionManager(client, config.tickleIntervalMs, config.brokerageTimeoutMs);

  const server = new McpServer({
    name: 'ibkr-mcp',
    version: '3.0.0',
  });

  registerAllTools(server, client, sessionManager);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  const shutdown = () => {
    sessionManager.stop();
    launcher.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  process.stderr.write(`Fatal: ${error}\n`);
  process.exit(1);
});
