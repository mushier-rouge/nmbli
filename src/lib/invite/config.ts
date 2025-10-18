export function shouldRequireInviteCode(): boolean {
  return (process.env.DEV_REQUIRE_INVITE_CODE ?? '').toLowerCase() === 'true';
}

export function hasInviteAccess(metadata: Record<string, unknown> | null | undefined): boolean {
  if (!metadata) return false;
  const value = metadata.devInviteGranted ?? metadata.dev_invite_granted;
  if (typeof value === 'string') {
    return value.toLowerCase() === 'true';
  }
  return Boolean(value);
}
