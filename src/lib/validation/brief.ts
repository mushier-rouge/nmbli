import { z } from 'zod';

export const createBriefSchema = z.object({
  zipcode: z.string().min(5).max(10),
  paymentType: z.enum(['cash', 'finance', 'lease']),
  maxOTD: z.coerce.number().positive(),
  makes: z.array(z.string().min(1)).min(1),
  models: z.array(z.string().min(1)).min(1),
  trims: z.array(z.string().min(1)).optional().default([]),
  colors: z.array(z.string().min(1)).optional().default([]),
  mustHaves: z.array(z.string().min(1)).optional().default([]),
  timelinePreference: z.string().min(3),
});

export type CreateBriefInput = z.infer<typeof createBriefSchema>;
