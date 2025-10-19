import { createBriefSchema, type CreateBriefInput } from '@/lib/validation/brief';
import { counterRequestSchema, type CounterRequest } from '@/lib/validation/quote';
import {
  dealerProspectSearchSchema,
  dealerProspectStatusSchema,
  type DealerProspectSearchInput,
  type DealerProspectStatusInput,
} from '@/lib/validation/dealer-prospect';

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }
  return response.json() as Promise<T>;
}

export async function apiCreateBrief(payload: CreateBriefInput) {
  createBriefSchema.parse(payload);
  const response = await fetch('/api/briefs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ brief: unknown }>(response);
}

export async function apiFetchBrief(id: string) {
  const response = await fetch(`/api/briefs/${id}`);
  return handleResponse<{ brief: unknown }>(response);
}

export async function apiInviteDealers(briefId: string, dealerIds: string[]) {
  const response = await fetch(`/api/briefs/${briefId}/invite-dealers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dealerIds }),
  });
  return handleResponse<{ invites: unknown[] }>(response);
}

export async function apiSendCounter(quoteId: string, counter: CounterRequest) {
  counterRequestSchema.parse(counter);
  const response = await fetch(`/api/quotes/${quoteId}/counter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(counter),
  });
  return handleResponse<{ status: string }>(response);
}

export async function apiAcceptQuote(quoteId: string) {
  const response = await fetch(`/api/quotes/${quoteId}/accept`, { method: 'POST' });
  return handleResponse<{ quote: unknown }>(response);
}

export async function apiDiscoverDealerProspects(briefId: string, payload: DealerProspectSearchInput) {
  dealerProspectSearchSchema.parse(payload);
  const response = await fetch(`/api/briefs/${briefId}/dealer-prospects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ prospects: unknown[]; created: number; updated: number }>(response);
}

export async function apiUpdateDealerProspectStatus(
  briefId: string,
  prospectId: string,
  payload: DealerProspectStatusInput,
) {
  dealerProspectStatusSchema.parse(payload);
  const response = await fetch(`/api/briefs/${briefId}/dealer-prospects/${prospectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse<{ prospect: unknown }>(response);
}
