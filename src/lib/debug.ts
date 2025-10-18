const DEBUG_ENABLED = process.env.DEBUG_AUTH?.toLowerCase() === 'true';

function sanitize(value: unknown) {
  if (typeof value === 'string') {
    if (value.includes('@')) {
      return value.replace(/(.{2}).+(@.+)/, '$1***$2');
    }
    if (value.length > 6) {
      return `${value.slice(0, 3)}***${value.slice(-2)}`;
    }
    return '***';
  }
  if (typeof value === 'object' && value !== null) {
    return '[object]';
  }
  return value;
}

export function debugAuth(scope: string, message: string, payload?: Record<string, unknown>) {
  if (!DEBUG_ENABLED) return;
  if (payload) {
    const safePayload: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload)) {
      safePayload[key] = sanitize(value);
    }
        console.info(`[auth:${scope}] ${message}`, JSON.stringify(safePayload));
  } else {
        console.info(`[auth:${scope}] ${message}`);
  }
}
