import { z } from 'zod';

export const contractUploadSchema = z.object({
  quoteId: z.string().uuid(),
});

export const contractCheckSchema = z.object({
  contractId: z.string().uuid(),
});

export const contractDiffInputSchema = z.object({
  vin: z.string().min(6),
  year: z.number().int(),
  make: z.string().min(1),
  model: z.string().min(1),
  trim: z.string().min(1),
  msrp: z.number().min(0),
  dealerDiscount: z.number(),
  incentives: z.array(z.object({ name: z.string().min(1), amount: z.number() })).default([]),
  fees: z.object({
    docFee: z.number().min(0).default(0),
    dmvFee: z.number().min(0).default(0),
    tireBatteryFee: z.number().min(0).default(0),
    otherFees: z.array(z.object({ name: z.string().min(1), amount: z.number().min(0) })).default([]),
  }),
  addons: z.array(z.object({ name: z.string().min(1), amount: z.number().min(0), approvedByBuyer: z.boolean() })).default([]),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().min(0),
  otdTotal: z.number().min(0),
});

export type ContractDiffInput = z.infer<typeof contractDiffInputSchema>;
