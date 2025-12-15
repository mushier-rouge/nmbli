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

const loggedWarnings = new Set<string>();
const loggedSupabaseHosts = new Set<string>();

/**
 * Reads an env var, sanitizes it, and throws a clear error if it is missing.
 */
export function requireEnv(name: string): string {
  const raw = process.env[name];
  const sanitized = sanitizeEnvValue(raw);

  if (!sanitized) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  if (raw && raw !== sanitized && !loggedWarnings.has(name)) {
    console.warn(`[env] Sanitized value for ${name} (removed whitespace/escaped newlines)`);
    loggedWarnings.add(name);
  }

  if (name.includes('SUPABASE_URL')) {
    try {
      const host = new URL(sanitized).host;
      if (!loggedSupabaseHosts.has(host)) {
        console.log(`[env] Supabase host for ${name}: ${host}`);
        loggedSupabaseHosts.add(host);
      }
    } catch {
      // ignore parse errors; requireEnv will still return the sanitized string
    }
  }

  return sanitized;
}
