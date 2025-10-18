import { describe, expect, it } from 'vitest';

import { Prisma } from '@/generated/prisma';
import { compareAmounts, compareCollections, TAX_TOLERANCE } from '@/lib/services/contracts';

const decimal = (value: number) => new Prisma.Decimal(value);

describe('compareAmounts', () => {
  it('matches amounts within tolerance', () => {
    expect(compareAmounts(decimal(100), 101, 2)).toBe(true);
    expect(compareAmounts(decimal(100), 103, 2)).toBe(false);
  });

  it('handles null expected value', () => {
    expect(compareAmounts(null, 0, TAX_TOLERANCE)).toBe(true);
  });
});

describe('compareCollections', () => {
  it('detects mismatched names or amounts', () => {
    const expected = [
      { name: 'Doc Fee', amount: decimal(150) },
      { name: 'DMV', amount: decimal(200) },
    ];
    const actual = [
      { name: 'Doc Fee', amount: 150 },
      { name: 'DMV', amount: 195 },
    ];
    const failures = compareCollections(expected, actual, { tolerance: 1 });
    expect(failures).toContain('dmv');
  });

  it('passes when collections match irrespective of order', () => {
    const expected = [
      { name: 'Incentive A', amount: decimal(-500) },
      { name: 'Incentive B', amount: decimal(-250) },
    ];
    const actual = [
      { name: 'Incentive B', amount: -250 },
      { name: 'Incentive A', amount: -500 },
    ];
    expect(compareCollections(expected, actual, { tolerance: 0 })).toHaveLength(0);
  });
});
