import type { DealerProspectStatus, Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { geminiSearchDealers, type GeminiDealerRecord } from '@/lib/integrations/gemini';

function buildProspectKey(record: { name: string; city?: string | null; state?: string | null; phone?: string | null; website?: string | null }) {
  const nameKey = record.name.trim().toLowerCase();
  const cityKey = record.city?.trim().toLowerCase() ?? '';
  const stateKey = record.state?.trim().toLowerCase() ?? '';
  const phoneKey = record.phone ? record.phone.replace(/\D/g, '') : '';
  const websiteKey = record.website ? record.website.replace(/^https?:\/\//, '').toLowerCase() : '';
  return [nameKey, cityKey, stateKey, phoneKey, websiteKey].filter(Boolean).join('|');
}

function toProspectData(briefId: string, suggestion: GeminiDealerRecord): Prisma.DealerProspectCreateInput {
  return {
    brief: { connect: { id: briefId } },
    name: suggestion.name,
    brand: suggestion.brand,
    city: suggestion.city ?? null,
    state: suggestion.state ?? null,
    zipcode: suggestion.zipcode ?? null,
    address: suggestion.address ?? null,
    phone: suggestion.phone ?? null,
    email: suggestion.email ?? null,
    website: suggestion.website ?? null,
    source: suggestion.source ?? 'gemini',
    notes: suggestion.notes ?? null,
    driveHours: suggestion.driveHours ?? null,
    distanceMiles: suggestion.distanceMiles ?? null,
  };
}

export async function listDealerProspects(briefId: string) {
  return prisma.dealerProspect.findMany({
    where: { briefId },
    orderBy: { createdAt: 'desc' },
  });
}

interface DiscoverDealerProspectsParams {
  briefId: string;
  driveHours: number;
  brands: string[];
  zip: string;
  limit?: number;
  additionalContext?: string;
}

export async function discoverDealerProspects(params: DiscoverDealerProspectsParams) {
  const { briefId, driveHours, brands, zip, limit, additionalContext } = params;
  const searchResult = await geminiSearchDealers({
    zip,
    brands,
    driveHours,
    limit,
    additionalContext,
  });

  if (searchResult.dealers.length === 0) {
    return { created: 0, updated: 0, prospects: [] as Prisma.DealerProspect[] };
  }

  const existing = await prisma.dealerProspect.findMany({ where: { briefId } });
  const existingMap = new Map<string, Prisma.DealerProspect>(
    existing.map((item) => [
      buildProspectKey({
        name: item.name,
        city: item.city,
        state: item.state,
        phone: item.phone,
        website: item.website,
      }),
      item,
    ]),
  );

  const toCreate: Prisma.DealerProspectCreateInput[] = [];
  const toUpdate: Array<{ id: string; data: Prisma.DealerProspectUpdateInput }> = [];

  searchResult.dealers.forEach((dealer) => {
    const key = buildProspectKey(dealer);
    const existingEntry = existingMap.get(key);

    if (existingEntry) {
      toUpdate.push({
        id: existingEntry.id,
        data: {
          brand: dealer.brand,
          city: dealer.city ?? existingEntry.city,
          state: dealer.state ?? existingEntry.state,
          zipcode: dealer.zipcode ?? existingEntry.zipcode,
          address: dealer.address ?? existingEntry.address,
          phone: dealer.phone ?? existingEntry.phone,
          email: dealer.email ?? existingEntry.email,
          website: dealer.website ?? existingEntry.website,
          source: dealer.source ?? existingEntry.source,
          notes: dealer.notes ?? existingEntry.notes,
          driveHours: dealer.driveHours ?? existingEntry.driveHours,
          distanceMiles: dealer.distanceMiles ?? existingEntry.distanceMiles,
        },
      });
    } else {
      toCreate.push(toProspectData(briefId, dealer));
    }
  });

  const createOps = toCreate.map((data) => prisma.dealerProspect.create({ data }));
  const updateOps = toUpdate.map(({ id, data }) =>
    prisma.dealerProspect.update({ where: { id }, data }),
  );

  await prisma.$transaction([...createOps, ...updateOps]);
  const createdCount = createOps.length;
  const updatedCount = updateOps.length;

  const refreshedProspects = await prisma.dealerProspect.findMany({
    where: { briefId },
    orderBy: { createdAt: 'desc' },
  });

  return { created: createdCount, updated: updatedCount, prospects: refreshedProspects };
}

interface UpdateDealerProspectParams {
  prospectId: string;
  status: DealerProspectStatus;
  notes?: string | null;
  markContacted?: boolean;
}

export async function updateDealerProspect(params: UpdateDealerProspectParams) {
  const { prospectId, status, notes, markContacted } = params;
  return prisma.dealerProspect.update({
    where: { id: prospectId },
    data: {
      status,
      notes: typeof notes === 'undefined' ? undefined : notes,
      lastContactedAt: markContacted ? new Date() : undefined,
    },
  });
}
