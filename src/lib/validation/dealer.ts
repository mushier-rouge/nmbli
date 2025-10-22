import { z } from 'zod';

export const dealerInfoSchema = z.object({
  name: z.string().min(1, 'Dealership name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be 2-letter code'),
  zipcode: z.string().regex(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
  phone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  email: z.string().email().optional().or(z.literal('')),
  make: z.string().optional(),
});

export type DealerInfo = z.infer<typeof dealerInfoSchema>;

export const dealerContactSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  role: z.enum(['sales', 'manager', 'internet_sales', 'other']).default('sales'),
  preferred_contact_method: z.enum(['email', 'sms', 'phone']).default('email'),
  notes: z.record(z.string(), z.unknown()).optional(),
});

export type DealerContact = z.infer<typeof dealerContactSchema>;
