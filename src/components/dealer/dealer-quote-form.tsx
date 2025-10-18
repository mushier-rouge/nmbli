'use client';

import * as React from 'react';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { toast } from 'sonner';

import { dealerQuoteSchema } from '@/lib/validation/quote';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

const formSchema = dealerQuoteSchema.extend({
  msrp: z.number().nonnegative(),
  dealerDiscount: z.number(),
  docFee: z.number().nonnegative(),
  dmvFee: z.number().nonnegative(),
  tireBatteryFee: z.number().nonnegative(),
  taxRate: z.number().min(0).max(1),
  taxAmount: z.number().nonnegative(),
  otdTotal: z.number().nonnegative(),
});

type DealerQuoteFormValues = z.infer<typeof formSchema>;

function numberInputProps(field: { value: number | undefined; onChange: (value: number) => void }) {
  return {
    value: field.value ?? '',
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => field.onChange(Number(event.target.value || '0')),
  };
}

interface DealerQuoteFormProps {
  token: string;
}

export function DealerQuoteForm({ token }: DealerQuoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<File[]>([]);

  const form = useForm<DealerQuoteFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vin: '',
      stockNumber: '',
      year: new Date().getFullYear(),
      make: '',
      model: '',
      trim: '',
      extColor: '',
      intColor: '',
      etaDate: undefined,
      msrp: 0,
      dealerDiscount: 0,
      docFee: 0,
      dmvFee: 0,
      tireBatteryFee: 0,
      otherFees: [],
      incentives: [],
      addons: [],
      taxRate: 0.1,
      taxAmount: 0,
      otdTotal: 0,
      payment: undefined,
      evidenceNote: '',
      confirmations: {
        noUnapprovedAddons: false,
        incentivesVerified: false,
        otdIncludesAllFees: false,
      },
      requiresCreditPullForCash: false,
      honorsAdvertisedVinPrice: false,
    },
  });

  const incentives = useFieldArray({ control: form.control, name: 'incentives' });
  const otherFees = useFieldArray({ control: form.control, name: 'otherFees' });
  const addons = useFieldArray({ control: form.control, name: 'addons' });

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      setPrimaryFile(file);
    }
  }

  function handleSupportingFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      setSupportingFiles(files);
    }
  }

  async function onSubmit(values: DealerQuoteFormValues) {
    if (!primaryFile) {
      toast.error('Upload the buyer order PDF');
      return;
    }

    startTransition(async () => {
      try {
        const formData = new FormData();
        formData.append('payload', JSON.stringify(values));
        formData.append('files', primaryFile);
        supportingFiles.forEach((file) => formData.append('files', file));

        const response = await fetch(`/api/dealer-invite/${token}`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message ?? 'Failed to submit quote');
        }

        toast.success('Quote submitted');
        router.refresh();
      } catch (error) {
        console.error(error);
        toast.error('Could not submit quote', {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    });
  }

  const totalIncentives = useMemo(
    () => form.watch('incentives').reduce((sum, incentive) => sum + (incentive?.amount ?? 0), 0),
    [form]
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Vehicle details</CardTitle>
            <p className="text-sm text-muted-foreground">Make sure the VIN matches the buyer order.</p>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>VIN</FormLabel>
                  <FormControl>
                    <Input placeholder="1ABCDEFG..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stockNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock #</FormLabel>
                  <FormControl>
                    <Input placeholder="EVE123" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Year</FormLabel>
                  <FormControl>
                    <Input type="number" min="2000" max="2100" {...numberInputProps(field)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="make"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Make</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Model</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="trim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Trim</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="extColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Exterior color</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="intColor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Interior color</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="etaDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ETA</FormLabel>
                  <FormControl>
                    <Input type="date" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing breakdown</CardTitle>
            <p className="text-sm text-muted-foreground">Itemize everything to keep the OTD honest.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="msrp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MSRP</FormLabel>
                    <FormControl>
                      <Input type="number" step="100" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dealerDiscount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dealer discount</FormLabel>
                    <FormControl>
                      <Input type="number" step="100" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="otdTotal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OTD total</FormLabel>
                    <FormControl>
                      <Input type="number" step="100" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="docFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doc fee</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dmvFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>DMV / Registration</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="tireBatteryFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tire & battery</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Other fees</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => otherFees.append({ name: '', amount: 0 })}>
                  Add fee
                </Button>
              </div>
              <div className="space-y-2">
                {otherFees.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 md:grid-cols-6">
                    <FormField
                      control={form.control}
                      name={`otherFees.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-4">
                          <FormLabel className="sr-only">Fee name</FormLabel>
                          <FormControl>
                            <Input placeholder="Delivery" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`otherFees.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="sr-only">Amount</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...numberInputProps(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                {otherFees.fields.length === 0 && <p className="text-xs text-muted-foreground">No extra dealer fees.</p>}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Incentives</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => incentives.append({ name: '', amount: 0 })}>
                  Add incentive
                </Button>
              </div>
              <div className="space-y-2">
                {incentives.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 md:grid-cols-6">
                    <FormField
                      control={form.control}
                      name={`incentives.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-4">
                          <FormLabel className="sr-only">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Toyota cash" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`incentives.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="sr-only">Amount</FormLabel>
                          <FormControl>
                            <Input type="number" step="100" {...numberInputProps(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                {incentives.fields.length === 0 && <p className="text-xs text-muted-foreground">No incentives applied.</p>}
              </div>
              <p className="text-xs text-muted-foreground">Total incentives: {totalIncentives.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
            </div>

            <Separator />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Add-ons</p>
                <Button type="button" variant="ghost" size="sm" onClick={() => addons.append({ name: '', amount: 0, isOptional: false })}>
                  Add add-on
                </Button>
              </div>
              <div className="space-y-2">
                {addons.fields.map((field, index) => (
                  <div key={field.id} className="grid gap-2 md:grid-cols-6">
                    <FormField
                      control={form.control}
                      name={`addons.${index}.name`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-3">
                          <FormLabel className="sr-only">Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Protection package" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`addons.${index}.amount`}
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel className="sr-only">Amount</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" {...numberInputProps(field)} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`addons.${index}.isOptional`}
                      render={({ field }) => (
                        <FormItem className="flex items-center gap-2">
                          <FormControl>
                            <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                          </FormControl>
                          <FormLabel className="text-xs">Optional?</FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                ))}
                {addons.fields.length === 0 && <p className="text-xs text-muted-foreground">No dealer add-ons.</p>}
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="taxRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax rate</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.001" min="0" max="1" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="taxAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tax amount</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" {...numberInputProps(field)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment terms (optional)</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-4">
            <FormField
              control={form.control}
              name="payment.type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <Input placeholder="cash / finance / lease" value={field.value ?? ''} onChange={(event) => field.onChange(event.target.value)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment.aprOrMf"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>APR / Money Factor</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.001" {...numberInputProps(field)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment.termMonths"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Term (months)</FormLabel>
                  <FormControl>
                    <Input type="number" step="1" {...numberInputProps(field)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="payment.dasAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due at signing</FormLabel>
                  <FormControl>
                    <Input type="number" step="100" {...numberInputProps(field)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confirmations</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <FormField
              control={form.control}
              name="confirmations.noUnapprovedAddons"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                  </FormControl>
                  <div>
                    <FormLabel>No unapproved add-ons</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmations.incentivesVerified"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                  </FormControl>
                  <div>
                    <FormLabel>Incentives eligible for buyer ZIP</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmations.otdIncludesAllFees"
              render={({ field }) => (
                <FormItem className="flex items-start gap-3">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                  </FormControl>
                  <div>
                    <FormLabel>OTD includes all fees</FormLabel>
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <Separator />
            <FormField
              control={form.control}
              name="requiresCreditPullForCash"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 text-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                  </FormControl>
                  <FormLabel>Credit pull required for cash / wire</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="honorsAdvertisedVinPrice"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 text-sm">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={(value) => field.onChange(Boolean(value))} />
                  </FormControl>
                  <FormLabel>Honoring advertised VIN price</FormLabel>
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Uploads</CardTitle>
            <p className="text-sm text-muted-foreground">Buyer order PDF is required. Add any supporting files.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormItem>
              <FormLabel>Buyer order (PDF)</FormLabel>
              <FormControl>
                <Input type="file" accept="application/pdf" onChange={handleFileChange} required />
              </FormControl>
              <FormMessage />
            </FormItem>
            <FormItem>
              <FormLabel>Supporting files</FormLabel>
              <FormControl>
                <Input type="file" multiple onChange={handleSupportingFiles} />
              </FormControl>
            </FormItem>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="evidenceNote"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Anything else the buyer should know" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Submitting…' : 'Submit quote'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
