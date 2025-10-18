import { z } from 'zod';

const money = z.number().min(0);
const optionalMoney = z.number().min(0).optional();

export const dealerQuoteSchema = z.object({
  vin: z.string().min(6).max(32),
  stockNumber: z.string().min(1).max(64),
  year: z.number().int().min(1980).max(2100),
  make: z.string().min(2),
  model: z.string().min(1),
  trim: z.string().min(1),
  extColor: z.string().min(1),
  intColor: z.string().min(1),
  etaDate: z.string().datetime().optional(),
  msrp: money,
  dealerDiscount: z.number(),
  docFee: optionalMoney.default(0),
  dmvFee: optionalMoney.default(0),
  tireBatteryFee: optionalMoney.default(0),
  otherFees: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z.number().min(0),
      })
    )
    .default([]),
  incentives: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z.number(),
      })
    )
    .default([]),
  addons: z
    .array(
      z.object({
        name: z.string().min(1),
        amount: z.number().min(0),
        isOptional: z.boolean().default(false),
      })
    )
    .default([]),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().min(0),
  otdTotal: z.number().min(0),
  payment: z
    .object({
      type: z.enum(['cash', 'finance', 'lease']),
      aprOrMf: z.number().min(0).optional(),
      termMonths: z.number().int().min(12).max(96).optional(),
      dasAmount: z.number().min(0).optional(),
    })
    .optional(),
  evidenceNote: z.string().max(500).optional(),
  confirmations: z.object({
    noUnapprovedAddons: z.boolean(),
    incentivesVerified: z.boolean(),
    otdIncludesAllFees: z.boolean(),
  }),
  requiresCreditPullForCash: z.boolean().optional().default(false),
  honorsAdvertisedVinPrice: z.boolean().optional().default(false),
});

export type DealerQuoteInput = z.infer<typeof dealerQuoteSchema>;

export const counterRequestSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('remove_addons'),
    addonNames: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('match_target'),
    targetOTD: z.number().min(0),
  }),
]);

export type CounterRequest = z.infer<typeof counterRequestSchema>;
