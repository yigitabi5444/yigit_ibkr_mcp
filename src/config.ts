export interface Config {
  gatewayUrl: string;
  apiBase: string;
  tickleIntervalMs: number;
  defaultAccountId?: string;
  sslVerify: boolean;
  requestTimeoutMs: number;
}

export function loadConfig(): Config {
  return {
    gatewayUrl: process.env.IBKR_GATEWAY_URL || 'https://localhost:4001',
    apiBase: '/v1/api',
    tickleIntervalMs: 55_000,
    defaultAccountId: process.env.IBKR_ACCOUNT_ID || undefined,
    sslVerify: process.env.IBKR_SSL_VERIFY === 'true',
    requestTimeoutMs: parseInt(process.env.IBKR_TIMEOUT_MS || '15000', 10),
  };
}
