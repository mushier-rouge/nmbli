import { describe, expect, it } from 'vitest';
import { isValidZip } from '../lib/zip';

describe('isValidZip', () => {
  it('accepts 5-digit ZIP codes', () => {
    expect(isValidZip('94105')).toBe(true);
  });

  it('accepts ZIP+4 format', () => {
    expect(isValidZip('10001-0001')).toBe(true);
  });

  it('rejects empty values', () => {
    expect(isValidZip('')).toBe(false);
  });

  it('rejects alphabetic strings', () => {
    expect(isValidZip('ABCDE')).toBe(false);
  });

  it('rejects malformed ZIP+4', () => {
    expect(isValidZip('1234-5678')).toBe(false);
  });
});
