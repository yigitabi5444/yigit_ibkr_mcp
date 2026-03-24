import { spawn, ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { Agent } from 'node:https';

const httpsAgent = new Agent({ rejectUnauthorized: false });

export class GatewayLauncher {
  private process: ChildProcess | null = null;
  private gatewayDir: string;
  private gatewayUrl: string;

  constructor(gatewayUrl: string) {
    this.gatewayUrl = gatewayUrl;
    // Look for clientportal.gw relative to the project root
    this.gatewayDir = resolve(import.meta.dirname || __dirname, '../../clientportal.gw');
  }

  /** Start the CP Gateway if not already running */
  async start(): Promise<boolean> {
    // Check if gateway is already running
    if (await this.isRunning()) {
      process.stderr.write('[ibkr-mcp] Client Portal Gateway already running.\n');
      return true;
    }

    const runScript = resolve(this.gatewayDir, 'bin/run.sh');
    const confFile = resolve(this.gatewayDir, 'root/conf.yaml');

    if (!existsSync(runScript)) {
      process.stderr.write(`[ibkr-mcp] Gateway not found at ${this.gatewayDir}. Skipping auto-launch.\n`);
      return false;
    }

    process.stderr.write('[ibkr-mcp] Starting Client Portal Gateway...\n');

    this.process = spawn('sh', [runScript, confFile], {
      cwd: this.gatewayDir,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: false,
    });

    this.process.stdout?.on('data', (data: Buffer) => {
      process.stderr.write(`[gateway] ${data.toString().trim()}\n`);
    });

    this.process.stderr?.on('data', (data: Buffer) => {
      process.stderr.write(`[gateway] ${data.toString().trim()}\n`);
    });

    this.process.on('exit', (code) => {
      process.stderr.write(`[ibkr-mcp] Gateway process exited with code ${code}\n`);
      this.process = null;
    });

    // Wait for gateway to become available
    const ready = await this.waitForReady(30000);
    if (ready) {
      process.stderr.write('[ibkr-mcp] Client Portal Gateway is ready.\n');
    } else {
      process.stderr.write('[ibkr-mcp] Gateway did not become ready in time. Login at ' + this.gatewayUrl + '\n');
    }
    return ready;
  }

  private async isRunning(): Promise<boolean> {
    try {
      // @ts-ignore
      const res = await fetch(`${this.gatewayUrl}/v1/api/tickle`, {
        method: 'POST',
        signal: AbortSignal.timeout(3000),
        // @ts-ignore
        dispatcher: httpsAgent,
      });
      return res.ok || res.status === 401;
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

  stop(): void {
    if (this.process) {
      process.stderr.write('[ibkr-mcp] Stopping Client Portal Gateway...\n');
      this.process.kill('SIGTERM');
      this.process = null;
    }
  }
}
