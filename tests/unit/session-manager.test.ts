import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/client/session-manager.js';
import { IBClient } from '../../src/client/ib-client.js';

// Create a mock IBClient
function createMockClient() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    setOnUnauthorized: vi.fn(),
    getDefaultAccountId: vi.fn(),
  } as unknown as IBClient;
}

describe('SessionManager', () => {
  let mockClient: IBClient;
  let manager: SessionManager;

  beforeEach(() => {
    vi.useFakeTimers();
    mockClient = createMockClient();
  });

  afterEach(() => {
    manager?.stop();
    vi.useRealTimers();
  });

  it('checks auth status on start', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      competing: false,
      connected: true,
      message: '',
    });

    manager = new SessionManager(mockClient, 55000);
    await manager.start();

    expect(mockClient.post).toHaveBeenCalledWith('/iserver/auth/status');
    expect(manager.isAuthenticated()).toBe(true);
  });

  it('sets up tickle interval', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      competing: false,
      connected: true,
      message: '',
    });

    manager = new SessionManager(mockClient, 55000);
    await manager.start();

    // Clear the initial auth call
    (mockClient.post as ReturnType<typeof vi.fn>).mockClear();

    // Advance time by 55 seconds
    await vi.advanceTimersByTimeAsync(55000);

    expect(mockClient.post).toHaveBeenCalledWith('/tickle');
  });

  it('handles failed auth check', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Connection refused'));

    manager = new SessionManager(mockClient, 55000);
    await manager.start();

    expect(manager.isAuthenticated()).toBe(false);
  });

  it('reports competing session', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      competing: true,
      connected: true,
      message: 'Another session is active',
    });

    manager = new SessionManager(mockClient, 55000);
    const status = await manager.checkAuthStatus();

    expect(status.competing).toBe(true);
  });

  it('attempts reauthentication', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({}) // reauthenticate call
      .mockResolvedValueOnce({ // checkAuthStatus after reauth
        authenticated: true,
        competing: false,
        connected: true,
        message: '',
      });

    manager = new SessionManager(mockClient, 55000);

    // We need real timers for the setTimeout in reauthenticate
    vi.useRealTimers();
    const result = await manager.reauthenticate();

    expect(result).toBe(true);
    expect(mockClient.post).toHaveBeenCalledWith('/iserver/reauthenticate');
  });

  it('stops tickle interval on stop', async () => {
    (mockClient.post as ReturnType<typeof vi.fn>).mockResolvedValue({
      authenticated: true,
      competing: false,
      connected: true,
      message: '',
    });

    manager = new SessionManager(mockClient, 55000);
    await manager.start();
    manager.stop();

    (mockClient.post as ReturnType<typeof vi.fn>).mockClear();

    // Advance time - no tickle should fire
    await vi.advanceTimersByTimeAsync(60000);
    expect(mockClient.post).not.toHaveBeenCalled();
  });
});
