import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IBClient, IBApiError, SessionError } from '../../src/client/ib-client.js';
import { RateLimiter } from '../../src/client/rate-limiter.js';
import { Config } from '../../src/config.js';
import http from 'node:http';
import { AddressInfo } from 'node:net';

function createTestConfig(port: number): Config {
  return {
    gatewayUrl: `http://localhost:${port}`,
    apiBase: '/v1/api',
    tickleIntervalMs: 55000,
    sslVerify: false,
    requestTimeoutMs: 5000,
  };
}

function createServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      const port = (server.address() as AddressInfo).port;
      resolve({ server, port });
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

describe('IBClient', () => {
  it('makes GET requests and parses JSON', async () => {
    const { server, port } = await createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accounts: ['U1234567'] }));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      const data = await client.get<{ accounts: string[] }>('/iserver/accounts');
      expect(data.accounts).toEqual(['U1234567']);
    } finally {
      await closeServer(server);
    }
  });

  it('makes POST requests with body', async () => {
    let receivedBody = '';
    const { server, port } = await createServer((req, res) => {
      let body = '';
      req.on('data', (chunk) => { body += chunk; });
      req.on('end', () => {
        receivedBody = body;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      });
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      await client.post('/iserver/auth/status', { test: true });
      expect(JSON.parse(receivedBody)).toEqual({ test: true });
    } finally {
      await closeServer(server);
    }
  });

  it('adds query parameters to GET requests', async () => {
    let receivedUrl = '';
    const { server, port } = await createServer((req, res) => {
      receivedUrl = req.url || '';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({}));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      await client.get('/iserver/marketdata/snapshot', { conids: '265598', fields: '31,84' });
      expect(receivedUrl).toContain('conids=265598');
      expect(receivedUrl).toContain('fields=31%2C84');
    } finally {
      await closeServer(server);
    }
  });

  it('throws IBApiError on non-2xx responses', async () => {
    const { server, port } = await createServer((_req, res) => {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal Server Error' }));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      await expect(client.get('/some/path')).rejects.toThrow(IBApiError);
    } finally {
      await closeServer(server);
    }
  });

  it('throws SessionError on 401 when no reauth handler', async () => {
    const { server, port } = await createServer((_req, res) => {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      await expect(client.get('/some/path')).rejects.toThrow(SessionError);
    } finally {
      await closeServer(server);
    }
  });

  it('retries on 401 with reauth handler', async () => {
    let callCount = 0;
    const { server, port } = await createServer((_req, res) => {
      callCount++;
      if (callCount === 1) {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
      } else {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ data: 'success' }));
      }
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      client.setOnUnauthorized(async () => true);

      const result = await client.get<{ data: string }>('/some/path');
      expect(result.data).toBe('success');
      expect(callCount).toBe(2);
    } finally {
      await closeServer(server);
    }
  });

  it('caches default account ID', async () => {
    let callCount = 0;
    const { server, port } = await createServer((_req, res) => {
      callCount++;
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accounts: ['U1234567'] }));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      const id1 = await client.getDefaultAccountId();
      const id2 = await client.getDefaultAccountId();

      expect(id1).toBe('U1234567');
      expect(id2).toBe('U1234567');
      expect(callCount).toBe(1);
    } finally {
      await closeServer(server);
    }
  });

  it('throws SessionError when no accounts found', async () => {
    const { server, port } = await createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ accounts: [] }));
    });

    try {
      const client = new IBClient(createTestConfig(port), new RateLimiter());
      await expect(client.getDefaultAccountId()).rejects.toThrow(SessionError);
    } finally {
      await closeServer(server);
    }
  });
});
