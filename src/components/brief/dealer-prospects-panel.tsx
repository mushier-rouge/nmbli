'use client';

import { useState, useTransition } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { apiDiscoverDealerProspects, apiUpdateDealerProspectStatus } from '@/lib/api/client';

const formSchema = z.object({
  brands: z.string().min(2, 'Enter at least one brand'),
  zip: z
    .string()
    .regex(/^\d{5}$/g, 'Enter a 5-digit ZIP code'),
  driveHours: z.coerce.number().min(0.5, 'Minimum 0.5 hours').max(8, 'Keep it under 8 hours'),
  limit: z.coerce.number().min(1).max(12).default(8),
  additionalContext: z.string().max(500).optional(),
});

type DealerProspectFormValues = z.infer<typeof formSchema>;

type DealerProspectStatus = 'pending' | 'contacted' | 'declined';

type DealerProspectEntry = {
  id: string;
  name: string;
  brand: string;
  city?: string | null;
  state?: string | null;
  zipcode?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  source?: string | null;
  notes?: string | null;
  driveHours?: number | null;
  distanceMiles?: number | null;
  status: DealerProspectStatus;
  createdAt: string;
  lastContactedAt?: string | null;
};

const STATUS_LABELS: Record<DealerProspectStatus, string> = {
  pending: 'Pending outreach',
  contacted: 'Contacted',
  declined: 'Declined',
};

const STATUS_VARIANT: Record<DealerProspectStatus, 'outline' | 'secondary' | 'destructive'> = {
  pending: 'outline',
  contacted: 'secondary',
  declined: 'destructive',
};

interface DealerProspectsPanelProps {
  briefId: string;
  defaultZip: string;
  defaultBrands: string[];
  prospects: DealerProspectEntry[];
}

function formatLocation(prospect: DealerProspectEntry) {
  const parts = [prospect.city, prospect.state].filter(Boolean);
  return parts.join(', ');
}

function formatDistance(prospect: DealerProspectEntry) {
  const distance = prospect.distanceMiles;
  const hours = prospect.driveHours;
  if (!distance && !hours) return null;
  const distanceText = distance ? `${distance.toFixed(0)} mi` : null;
  const hoursText = hours ? `${hours.toFixed(1)} h drive` : null;
  return [distanceText, hoursText].filter(Boolean).join(' • ');
}

export function DealerProspectsPanel({ briefId, defaultZip, defaultBrands, prospects }: DealerProspectsPanelProps) {
  const router = useRouter();
  const [isSearching, startSearch] = useTransition();
  const [busyProspectId, setBusyProspectId] = useState<string | null>(null);

  const form = useForm<DealerProspectFormValues>({
    resolver: zodResolver(formSchema) as Resolver<DealerProspectFormValues>,
    defaultValues: {
      brands: defaultBrands.join(', '),
      zip: defaultZip,
      driveHours: 2,
      limit: 8,
      additionalContext: '',
    },
  });

  async function onSubmit(values: DealerProspectFormValues) {
    const brands = values.brands
      .split(',')
      .map((brand) => brand.trim())
      .filter(Boolean);

    if (brands.length === 0) {
      form.setError('brands', { message: 'Add at least one brand' });
      return;
    }

    startSearch(async () => {
      try {
        await apiDiscoverDealerProspects(briefId, {
          zip: values.zip,
          driveHours: values.driveHours,
          limit: values.limit,
          additionalContext: values.additionalContext || undefined,
          brands,
        });
        toast.success('Dealer suggestions refreshed');
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to search dealers';
        toast.error(message);
      }
    });
  }

  async function handleStatusChange(prospect: DealerProspectEntry, status: DealerProspectStatus) {
    setBusyProspectId(prospect.id);
    try {
      await apiUpdateDealerProspectStatus(briefId, prospect.id, {
        status,
        notes: prospect.notes ?? undefined,
      });
      toast.success(`Marked ${prospect.name} as ${STATUS_LABELS[status].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update status';
      toast.error(message);
    } finally {
      setBusyProspectId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Find dealers nearby</CardTitle>
          <p className="text-sm text-muted-foreground">
            Search for franchise dealers within a chosen drive time. We&apos;ll pull contact details and keep them here for
            outreach tracking.
          </p>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="brands"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Brand(s)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Toyota, Lexus" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ZIP code</FormLabel>
                    <FormControl>
                      <Input placeholder="94105" maxLength={5} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="driveHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Drive time (hours)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" min={0.5} max={8} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="limit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>How many suggestions</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} max={12} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="additionalContext"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Buyer notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Any must-haves, trims, or incentives to mention" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="md:col-span-2 flex justify-end">
                <Button type="submit" disabled={isSearching}>
                  {isSearching ? 'Searching…' : 'Search dealers'}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {prospects.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Run a search to start building your outreach list.
            </CardContent>
          </Card>
        ) : (
          prospects.map((prospect) => (
            <Card key={prospect.id}>
              <CardHeader className="gap-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg font-semibold">{prospect.name}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {prospect.brand}
                      {formatLocation(prospect) ? ` • ${formatLocation(prospect)}` : ''}
                    </p>
                  </div>
                  <Badge variant={STATUS_VARIANT[prospect.status]}>{STATUS_LABELS[prospect.status]}</Badge>
                </div>
                {formatDistance(prospect) && (
                  <p className="text-xs text-muted-foreground">{formatDistance(prospect)}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex flex-wrap gap-x-6 gap-y-2">
                  {prospect.address && <span className="text-muted-foreground">{prospect.address}</span>}
                  {prospect.phone && (
                    <a href={`tel:${prospect.phone}`} className="text-primary hover:underline">
                      {prospect.phone}
                    </a>
                  )}
                  {prospect.email && (
                    <a href={`mailto:${prospect.email}`} className="text-primary hover:underline">
                      {prospect.email}
                    </a>
                  )}
                  {prospect.website && (
                    <a href={prospect.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Website
                    </a>
                  )}
                  {prospect.source && <span className="text-xs uppercase tracking-wide text-muted-foreground">{prospect.source}</span>}
                </div>
                {prospect.notes && <p className="text-muted-foreground">{prospect.notes}</p>}
                <Separator />
                <div className="flex flex-wrap items-center gap-3">
                  <Select
                    value={prospect.status}
                    onValueChange={(value) => handleStatusChange(prospect, value as DealerProspectStatus)}
                    disabled={busyProspectId === prospect.id}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Update status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending outreach</SelectItem>
                      <SelectItem value="contacted">Contacted</SelectItem>
                      <SelectItem value="declined">Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  {prospect.lastContactedAt && (
                    <span className="text-xs text-muted-foreground">
                      Last contacted {new Date(prospect.lastContactedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </CardContent>
              <CardFooter className="text-xs text-muted-foreground">
                Added {new Date(prospect.createdAt).toLocaleDateString()}
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
