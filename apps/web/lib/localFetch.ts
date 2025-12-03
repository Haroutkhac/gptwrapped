const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
const ENV_ORIGIN_KEY = 'NEXT_PUBLIC_APP_ORIGIN';

function readServerOrigin() {
  if (typeof process === 'undefined' || !process?.env) {
    return undefined;
  }
  return process.env[ENV_ORIGIN_KEY];
}

function getDefaultOrigin() {
  const envOrigin = readServerOrigin();
  if (envOrigin) {
    return envOrigin;
  }
  if (typeof window === 'undefined') {
    return 'http://localhost:3000';
  }
  return window.location.origin;
}

function normalizeOrigin(origin: string) {
  const url = new URL(origin);
  return `${url.protocol}//${url.host}`;
}

function makeAllowedOrigins(origin: string) {
  const normalized = normalizeOrigin(origin);
  const hosts = new Set<string>([normalized]);
  const baseUrl = new URL(normalized);
  for (const host of LOCAL_HOSTS) {
    const portSuffix = baseUrl.port ? `:${baseUrl.port}` : '';
    hosts.add(`${baseUrl.protocol}//${host}${portSuffix}`);
    hosts.add(`${baseUrl.protocol}//${host}`);
    hosts.add(`${baseUrl.protocol}//${host}:3000`);
    hosts.add(`${baseUrl.protocol}//${host}:7777`);
  }
  return hosts;
}

export function resolveRequestUrl(input: RequestInfo | URL, baseOrigin: string = getDefaultOrigin()) {
  if (typeof input === 'string') {
    if (input.startsWith('http://') || input.startsWith('https://')) {
      return new URL(input);
    }
    return new URL(input, baseOrigin);
  }

  if (input instanceof URL) {
    return input;
  }

  if (typeof Request !== 'undefined' && input instanceof Request) {
    return new URL(input.url);
  }

  return new URL(String(input), baseOrigin);
}

export function assertLocalOnly(url: URL, baseOrigin: string = getDefaultOrigin()) {
  const allowed = makeAllowedOrigins(baseOrigin);
  if (!allowed.has(`${url.protocol}//${url.host}`)) {
    throw new Error(`Outbound network blocked: ${url.toString()}`);
  }
}

export async function localFetch(input: RequestInfo | URL, init?: RequestInit) {
  const base = getDefaultOrigin();
  const url = resolveRequestUrl(input, base);
  assertLocalOnly(url, base);
  return globalThis.fetch(url.toString(), init);
}
