const ZIP_REGEX = /^(\d{5})(?:-\d{4})?$/;

export function isValidZip(input: string): boolean {
  const normalized = input.trim();
  if (!normalized) {
    return false;
  }
  return ZIP_REGEX.test(normalized);
}
