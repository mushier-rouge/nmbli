import { z } from 'zod';

export const dealerProspectSearchSchema = z.object({
  zip: z.string().regex(/^\d{5}$/, 'Enter a 5-digit ZIP code'),
  driveHours: z.coerce.number().min(0.5).max(8),
  brands: z.array(z.string().min(2)).min(1).max(4),
  limit: z.coerce.number().min(1).max(12).optional(),
  additionalContext: z.string().max(500).optional(),
});

export const dealerProspectStatusSchema = z.object({
  status: z.enum(['pending', 'contacted', 'declined']),
  notes: z.string().max(1000).optional(),
});

export type DealerProspectSearchInput = z.infer<typeof dealerProspectSearchSchema>;
export type DealerProspectStatusInput = z.infer<typeof dealerProspectStatusSchema>;
