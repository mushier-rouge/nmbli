import type { QuoteStatus, BriefStatus, DealerProspectStatus, ContractStatus } from '@/generated/prisma';

// Badge variants for shadcn/ui
export type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';

// Quote Status
export const QUOTE_STATUS_LABELS: Record<QuoteStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  superseded: 'Superseded',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export const QUOTE_STATUS_VARIANTS: Record<QuoteStatus, BadgeVariant> = {
  draft: 'outline',
  published: 'secondary',
  superseded: 'outline',
  accepted: 'default',
  rejected: 'destructive',
};

// Brief Status
export const BRIEF_STATUS_LABELS: Record<BriefStatus, string> = {
  sourcing: 'Sourcing Dealers',
  offers: 'Reviewing Offers',
  negotiation: 'Negotiating',
  contract: 'Contract Review',
  done: 'Complete',
};

export const BRIEF_STATUS_VARIANTS: Record<BriefStatus, BadgeVariant> = {
  sourcing: 'outline',
  offers: 'secondary',
  negotiation: 'secondary',
  contract: 'secondary',
  done: 'default',
};

// Dealer Prospect Status
export const DEALER_PROSPECT_STATUS_LABELS: Record<DealerProspectStatus, string> = {
  pending: 'Pending Outreach',
  contacted: 'Contacted',
  declined: 'Declined',
};

export const DEALER_PROSPECT_STATUS_VARIANTS: Record<DealerProspectStatus, BadgeVariant> = {
  pending: 'outline',
  contacted: 'secondary',
  declined: 'destructive',
};

// Contract Status
export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  uploaded: 'Uploaded',
  checked_ok: 'Verified',
  mismatch: 'Needs Review',
};

export const CONTRACT_STATUS_VARIANTS: Record<ContractStatus, BadgeVariant> = {
  uploaded: 'outline',
  checked_ok: 'default',
  mismatch: 'destructive',
};

// Helper functions
export function getQuoteStatusLabel(status: QuoteStatus): string {
  return QUOTE_STATUS_LABELS[status];
}

export function getQuoteStatusVariant(status: QuoteStatus): BadgeVariant {
  return QUOTE_STATUS_VARIANTS[status];
}

export function getBriefStatusLabel(status: BriefStatus): string {
  return BRIEF_STATUS_LABELS[status];
}

export function getBriefStatusVariant(status: BriefStatus): BadgeVariant {
  return BRIEF_STATUS_VARIANTS[status];
}

export function getDealerProspectStatusLabel(status: DealerProspectStatus): string {
  return DEALER_PROSPECT_STATUS_LABELS[status];
}

export function getDealerProspectStatusVariant(status: DealerProspectStatus): BadgeVariant {
  return DEALER_PROSPECT_STATUS_VARIANTS[status];
}

export function getContractStatusLabel(status: ContractStatus): string {
  return CONTRACT_STATUS_LABELS[status];
}

export function getContractStatusVariant(status: ContractStatus): BadgeVariant {
  return CONTRACT_STATUS_VARIANTS[status];
}
