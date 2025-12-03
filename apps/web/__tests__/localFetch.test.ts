import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { localFetch, resolveRequestUrl } from '@/lib/localFetch';

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv, NEXT_PUBLIC_APP_ORIGIN: 'http://localhost:7777' };
  global.fetch = vi.fn(async () => new Response('{}', { status: 200 })) as typeof global.fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  process.env = { ...originalEnv };
});

describe('resolveRequestUrl', () => {
  it('creates absolute URL from relative input', () => {
    const url = resolveRequestUrl('/data/example.json', 'http://localhost:9999');
    expect(url.toString()).toBe('http://localhost:9999/data/example.json');
  });
});

describe('localFetch', () => {
  it('allows same-origin requests', async () => {
    await localFetch('/data/sample.json');
    expect(global.fetch).toHaveBeenCalledWith('http://localhost:7777/data/sample.json', undefined);
  });

  it('throws on remote origins', async () => {
    await expect(localFetch('https://example.com/data.json')).rejects.toThrow('Outbound network blocked');
  });
});
