import { describe, expect, it } from 'vitest';

import { calculateShadinessScore } from '@/lib/services/quotes';
import type { DealerQuoteInput } from '@/lib/validation/quote';

function baseQuote(): DealerQuoteInput {
  return {
    vin: '1ABCDEFG2H3I45678',
    stockNumber: 'EVE123',
    year: 2025,
    make: 'Toyota',
    model: 'Grand Highlander',
    trim: 'Limited',
    extColor: 'Gray',
    intColor: 'Black',
    msrp: 50000,
    dealerDiscount: -1500,
    docFee: 150,
    dmvFee: 180,
    tireBatteryFee: 25,
    otherFees: [],
    incentives: [],
    addons: [],
    taxRate: 0.1025,
    taxAmount: 5000,
    otdTotal: 52000,
    confirmations: {
      noUnapprovedAddons: true,
      incentivesVerified: true,
      otdIncludesAllFees: true,
    },
    requiresCreditPullForCash: false,
    honorsAdvertisedVinPrice: false,
  };
}

describe('calculateShadinessScore', () => {
  it('returns low score for clean quotes', () => {
    const score = calculateShadinessScore(baseQuote());
    expect(score).toBe(0);
  });

  it('penalizes missing itemization', () => {
    const quote = baseQuote();
    quote.otdTotal = 48000;
    quote.docFee = 0;
    quote.dmvFee = 0;
    quote.tireBatteryFee = 0;
    const score = calculateShadinessScore(quote);
    expect(score).toBeGreaterThanOrEqual(10);
  });

  it('penalizes forced add-ons and credit pulls', () => {
    const quote = baseQuote();
    quote.addons = [
      { name: 'Nitrogen package', amount: 899, isOptional: false },
    ];
    quote.requiresCreditPullForCash = true;
    const score = calculateShadinessScore(quote);
    expect(score).toBeGreaterThanOrEqual(25);
  });

  it('rewards honoring advertised price', () => {
    const quote = baseQuote();
    quote.honorsAdvertisedVinPrice = true;
    const score = calculateShadinessScore(quote);
    expect(score).toBe(0);
  });
});
