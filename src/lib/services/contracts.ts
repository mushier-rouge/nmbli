import { Prisma, ContractStatus, FileOwnerType, QuoteLineKind, QuoteStatus } from '@/generated/prisma';
import type { TimelineActor as TimelineActorType, TimelineEventType as TimelineEventTypeType } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import { toDecimal } from '@/lib/utils/prisma-helpers';
import type { ContractDiffInput } from '@/lib/validation/contract';
import { uploadFileToStorage } from './storage';
import { recordTimelineEvent } from './timeline';

export const TAX_TOLERANCE = 2; // dollars

export function compareAmounts(expected: Prisma.Decimal | null, actual: number, tolerance = 0) {
  if (!expected) {
    return Math.abs(actual) <= tolerance;
  }
  const diff = Math.abs(expected.toNumber() - actual);
  return diff <= tolerance;
}

export function normalizeMap(items: { name: string; amount: number }[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    map.set(item.name.toLowerCase(), item.amount);
  }
  return map;
}

export function compareCollections(
  expected: { name: string; amount: Prisma.Decimal }[],
  actual: { name: string; amount: number }[],
  { tolerance = 0, allowMissing = false }: { tolerance?: number; allowMissing?: boolean } = {}
) {
  const expectedMap = new Map<string, number>();
  for (const item of expected) {
    expectedMap.set(item.name.toLowerCase(), item.amount.toNumber());
  }

  const actualMap = normalizeMap(actual);
  const failures: string[] = [];

  for (const [name, amount] of expectedMap.entries()) {
    const actualAmount = actualMap.get(name);
    if (actualAmount === undefined) {
      if (!allowMissing) {
        failures.push(name);
      }
      continue;
    }
    if (Math.abs(amount - actualAmount) > tolerance) {
      failures.push(name);
    }
  }

  for (const [name] of actualMap.entries()) {
    if (!expectedMap.has(name)) {
      failures.push(name);
    }
  }

  return failures;
}

export async function uploadContractFiles(params: { quoteId: string; files: File[] }) {
  const { quoteId, files } = params;

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { contract: true },
  });

  if (!quote) {
    throw new Error('Quote not found');
  }

  if (quote.status !== QuoteStatus.accepted) {
    throw new Error('Contract files can only be uploaded for accepted quotes');
  }

  const contract = quote.contract
    ? await prisma.contract.update({
        where: { id: quote.contract.id },
        data: { status: ContractStatus.uploaded },
      })
    : await prisma.contract.create({
        data: {
          quoteId,
          status: ContractStatus.uploaded,
          checks: { status: 'pending' },
        },
      });

  if (files.length > 0) {
    await Promise.all(
      files.map(async (file) => {
        const upload = await uploadFileToStorage({ file, pathPrefix: `contracts/${quoteId}` });
        await prisma.fileAsset.create({
          data: {
            ownerType: FileOwnerType.contract,
            ownerId: contract.id,
            url: upload.url,
            mimeType: upload.mimeType,
            originalName: upload.originalName,
            size: upload.size,
            contractId: contract.id,
          },
        });
      })
    );
  }

  await recordTimelineEvent({
    briefId: quote.briefId,
    quoteId: quote.id,
    type: 'contract_uploaded' as TimelineEventTypeType,
    actor: 'dealer' as TimelineActorType,
    payload: {
      contractId: contract.id,
      fileCount: files.length,
    },
  });

  return contract;
}

export async function checkContractAgainstQuote(params: { contractId: string; input: ContractDiffInput }) {
  const { contractId, input } = params;

  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: {
      quote: {
        include: {
          lines: true,
          brief: true,
          dealer: true,
        },
      },
    },
  });

  if (!contract || !contract.quote) {
    throw new Error('Contract not found');
  }

  const quote = contract.quote;

  const checks: Array<{ field: string; pass: boolean; expected: unknown; actual: unknown; notes?: string }> = [];

  const match = (field: string, expected: unknown, actual: unknown) => {
    const pass = expected === actual;
    checks.push({ field, pass, expected, actual });
    return pass;
  };

  match('vin', quote.vin, input.vin);
  match('year', quote.year, input.year);
  match('make', quote.make, input.make);
  match('model', quote.model, input.model);
  match('trim', quote.trim, input.trim);

  checks.push({
    field: 'msrp',
    pass: compareAmounts(quote.msrp, input.msrp),
    expected: quote.msrp?.toNumber(),
    actual: input.msrp,
  });
  checks.push({
    field: 'dealerDiscount',
    pass: compareAmounts(quote.dealerDiscount, input.dealerDiscount),
    expected: quote.dealerDiscount?.toNumber(),
    actual: input.dealerDiscount,
  });

  const quoteIncentives = quote.lines.filter((line) => line.kind === QuoteLineKind.incentive);
  const incentiveFailures = compareCollections(
    quoteIncentives.map((line) => ({ name: line.name, amount: line.amount })),
    input.incentives,
    { tolerance: 1 }
  );
  checks.push({
    field: 'incentives',
    pass: incentiveFailures.length === 0,
    expected: quoteIncentives.map((line) => ({ name: line.name, amount: line.amount.toNumber() })),
    actual: input.incentives,
    notes: incentiveFailures.length ? `Mismatch: ${incentiveFailures.join(', ')}` : undefined,
  });

  const feeFailures = compareCollections(
    [
      { name: 'docFee', amount: quote.docFee ?? toDecimal(0) },
      { name: 'dmvFee', amount: quote.dmvFee ?? toDecimal(0) },
      { name: 'tireBatteryFee', amount: quote.tireBatteryFee ?? toDecimal(0) },
      ...quote.lines
        .filter((line) => line.kind === QuoteLineKind.fee && !['Doc Fee', 'DMV / Registration', 'Tire & Battery'].includes(line.name))
        .map((line) => ({ name: line.name, amount: line.amount })),
    ],
    [
      { name: 'docFee', amount: input.fees.docFee },
      { name: 'dmvFee', amount: input.fees.dmvFee },
      { name: 'tireBatteryFee', amount: input.fees.tireBatteryFee },
      ...input.fees.otherFees,
    ],
    { tolerance: 1 }
  );
  checks.push({
    field: 'fees',
    pass: feeFailures.length === 0,
    expected: {
      docFee: quote.docFee?.toNumber() ?? 0,
      dmvFee: quote.dmvFee?.toNumber() ?? 0,
      tireBatteryFee: quote.tireBatteryFee?.toNumber() ?? 0,
      otherFees: quote.lines
        .filter((line) => line.kind === QuoteLineKind.fee)
        .map((line) => ({ name: line.name, amount: line.amount.toNumber() })),
    },
    actual: input.fees,
    notes: feeFailures.length ? `Mismatch: ${feeFailures.join(', ')}` : undefined,
  });

  const addonFailures = input.addons.filter((addon) => !addon.approvedByBuyer);
  checks.push({
    field: 'addons',
    pass: addonFailures.length === 0,
    expected: quote.lines
      .filter((line) => line.kind === QuoteLineKind.addon)
      .map((line) => ({ name: line.name, approvedByBuyer: line.approvedByBuyer })),
    actual: input.addons,
    notes: addonFailures.length ? 'Unapproved addons present' : undefined,
  });

  checks.push({
    field: 'taxRate',
    pass: compareAmounts(quote.taxRate, input.taxRate),
    expected: quote.taxRate?.toNumber(),
    actual: input.taxRate,
  });

  checks.push({
    field: 'taxAmount',
    pass: compareAmounts(quote.taxAmount, input.taxAmount, TAX_TOLERANCE),
    expected: quote.taxAmount?.toNumber(),
    actual: input.taxAmount,
    notes: `Allowed tolerance $${TAX_TOLERANCE}`,
  });

  checks.push({
    field: 'otdTotal',
    pass: compareAmounts(quote.otdTotal, input.otdTotal),
    expected: quote.otdTotal?.toNumber(),
    actual: input.otdTotal,
  });

  const allPass = checks.every((item) => item.pass);

  const updated = await prisma.contract.update({
    where: { id: contractId },
    data: {
      status: allPass ? ContractStatus.checked_ok : ContractStatus.mismatch,
      checks: checks as Prisma.InputJsonValue,
    },
  });

  await recordTimelineEvent({
    briefId: quote.briefId,
    quoteId: quote.id,
    type: (allPass ? 'contract_pass' : 'contract_mismatch') as TimelineEventTypeType,
    actor: 'system' as TimelineActorType,
    payload: {
      contractId,
      checks,
    } as Prisma.InputJsonValue,
  });

  if (allPass) {
    await prisma.quote.update({
      where: { id: quote.id },
      data: {
        shadinessScore: Math.max(0, (quote.shadinessScore ?? 0) - 15),
      },
    });
  }

  return updated;
}
