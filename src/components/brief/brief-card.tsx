'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MoreVertical, Trash2, Edit } from 'lucide-react';
import { toast } from 'sonner';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils/number';
import { formatPaymentSummary } from '@/lib/utils/payment';

type BriefCardProps = {
  brief: {
    id: string;
    status: string;
    makes: unknown;
    models: unknown;
    zipcode: string;
    maxOTD: { toNumber(): number };
    paymentPreferences: unknown;
    paymentType: string;
    mustHaves: unknown;
    updatedAt: Date | string;
  };
};

export function BriefCard({ brief }: BriefCardProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (
      !confirm(
        'Are you sure you want to delete this brief? This action cannot be undone.'
      )
    ) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(`/api/briefs/${brief.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to delete brief');
      }

      toast.success('Brief deleted successfully');
      router.refresh();
    } catch (error) {
      console.error('Error deleting brief:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete brief'
      );
      setIsDeleting(false);
    }
  }

  const makes = Array.isArray(brief.makes)
    ? brief.makes
        .filter((m) => m != null)
        .map((m) => String(m))
        .join(', ')
    : '';
  const models = Array.isArray(brief.models)
    ? brief.models
        .filter((m) => m != null)
        .map((m) => String(m))
        .join(', ')
    : '';
  const title = `${makes} ${models}`.trim();

  const paymentSummaries = formatPaymentSummary(
    brief.paymentPreferences,
    brief.paymentType
  );

  // Only allow edit/delete when brief is in "sourcing" status
  const canEdit = brief.status === 'sourcing';

  return (
    <Card className="flex h-full flex-col justify-between">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            <span>{title}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              <span>{String(brief.status)}</span>
            </Badge>
            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={isDeleting}
                  >
                    <MoreVertical className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href={`/briefs/${brief.id}/edit`} className="flex items-center">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit brief
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete brief'}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          ZIP {String(brief.zipcode)} · Max OTD{' '}
          {formatCurrency(brief.maxOTD.toNumber())}
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-1">
          <p className="text-sm font-medium">Payment preferences</p>
          {paymentSummaries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Not specified</p>
          ) : (
            <ul className="text-sm text-muted-foreground">
              {paymentSummaries
                .filter(
                  (summary) => summary != null && typeof summary === 'string'
                )
                .map((summary, index) => (
                  <li key={`${brief.id}-payment-${index}`}>
                    <span>{String(summary)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
        {Array.isArray(brief.mustHaves) && brief.mustHaves.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Must-haves:{' '}
            {brief.mustHaves
              .filter((m) => m != null)
              .map((m) => String(m))
              .join(', ')}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Last updated {new Date(brief.updatedAt).toLocaleDateString()}
        </p>
      </CardContent>
      <CardFooter>
        <Button asChild variant="secondary" className="w-full">
          <Link href={`/briefs/${brief.id}`}>Open timeline</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
