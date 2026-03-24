import { spawn } from 'node:child_process';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const PID_FILE = '/tmp/ibkr-cpgateway.pid';

export class GatewayLauncher {
  private gatewayDir: string;
  private gatewayUrl: string;

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl;
    this.gatewayDir = resolve(import.meta.dirname || __dirname, '../../clientportal.gw');
  }

  /** Extract port from gateway URL */
  private get port(): number {
    try {
      return parseInt(new URL(this.gatewayUrl).port, 10) || 5001;
    } catch {
      return 5001;
    }
  }

  /** Check if the port is already in use (faster than HTTP check) */
  private async isPortInUse(): Promise<boolean> {
    const net = await import('node:net');
    return new Promise((resolve) => {
      const sock = new net.Socket();
      sock.setTimeout(1000);
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('error', () => { sock.destroy(); resolve(false); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.connect(this.port, '127.0.0.1');
    });
  }

  /** Start the CP Gateway as a detached process if not already running */
  async start(): Promise<boolean> {
    // Quick port check first — faster than HTTP
    if (await this.isPortInUse()) {
      process.stderr.write(`[ibkr-mcp] Port ${this.port} already in use — Client Portal Gateway is running.\n`);
      return true;
    }

    this.cleanStalePid();

    const runScript = resolve(this.gatewayDir, 'bin/run.sh');
    const confFile = resolve(this.gatewayDir, 'root/conf.yaml');

    if (!existsSync(runScript)) {
      process.stderr.write(`[ibkr-mcp] Gateway not found at ${this.gatewayDir}. Download from IB and place in clientportal.gw/.\n`);
      process.stderr.write('[ibkr-mcp] Tools will still work if you start the gateway manually.\n');
      return false;
    }

    process.stderr.write('[ibkr-mcp] Starting Client Portal Gateway as detached process...\n');

    // Spawn detached — survives MCP restarts
    const child = spawn('sh', [runScript, confFile], {
      cwd: this.gatewayDir,
      stdio: 'ignore',
      detached: true,
      env: {
        ...process.env,
        // Ensure Java is on PATH (macOS Homebrew)
        PATH: `/opt/homebrew/opt/openjdk/bin:/usr/local/opt/openjdk/bin:${process.env.PATH}`,
        JAVA_HOME: process.env.JAVA_HOME || '/opt/homebrew/opt/openjdk/libexec/openjdk.jdk/Contents/Home',
      },
    });

    // Save PID for cleanup / stale detection
    if (child.pid) {
      writeFileSync(PID_FILE, String(child.pid));
    }

    // Detach from parent — MCP can exit without killing gateway
    child.unref();

    // Wait for gateway to accept connections
    const ready = await this.waitForReady(30000);
    if (ready) {
      process.stderr.write('[ibkr-mcp] Client Portal Gateway is ready.\n');
    } else {
      process.stderr.write(`[ibkr-mcp] Gateway started but not responding yet. Login at ${this.gatewayUrl}\n`);
    }
    return ready;
  }

  /** Check if gateway is responding on its port */
  async isRunning(): Promise<boolean> {
    try {
      // NODE_TLS_REJECT_UNAUTHORIZED=0 is set by ib-client.ts
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
      const res = await fetch(`${this.gatewayUrl}/v1/api/iserver/auth/status`, {
        method: 'GET',
        headers: { 'User-Agent': 'ibkr-mcp/3.0' },
        signal: AbortSignal.timeout(3000),
      });
      return true;
    } catch {
      return false;
    }
  }

  private async waitForReady(timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      if (await this.isRunning()) return true;
      await new Promise((r) => setTimeout(r, 1000));
    }
    return false;
  }

  private cleanStalePid(): void {
    try {
      if (existsSync(PID_FILE)) {
        const pid = parseInt(readFileSync(PID_FILE, 'utf-8').trim(), 10);
        try {
          // Check if process is still alive (signal 0 = just check)
          process.kill(pid, 0);
          // Process exists — gateway might be starting up, don't kill it
        } catch {
          // Process is dead — clean up stale PID file
          unlinkSync(PID_FILE);
        }
      }
    } catch {
      // Ignore errors
    }
  }

  /** Stop is a no-op for detached processes — gateway lives independently */
  stop(): void {
    // Intentionally empty — detached gateway survives MCP exit
  }
}
