/**
 * Removes common formatting issues from environment variable values such as
 * escaped newlines copied from dashboards and stray whitespace.
 */
export function sanitizeEnvValue(value: string | undefined | null): string {
  if (!value) {
    return '';
  }

  const trimmed = value.trim();
  const cleaned = trimmed.replace(/\\n/g, '');

  return cleaned;
}

/**
 * Reads an env var, sanitizes it, and throws a clear error if it is missing.
 */
export function requireEnv(name: string): string {
  const raw = process.env[name];
  const sanitized = sanitizeEnvValue(raw);

  if (!sanitized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (raw && raw !== sanitized) {
    console.warn(`[env] Sanitized value for ${name} (removed whitespace/escaped newlines)`);
  }

  return sanitized;
}
