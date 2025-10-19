import {
  PrismaClient,
  PaymentType,
  BriefStatus,
  DealerInviteState,
  QuoteStatus,
  QuoteLineKind,
  ContractStatus,
  QuoteSource,
} from '../src/generated/prisma';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const buyerId = '00000000-0000-4000-8000-000000000001';
  const opsId = '00000000-0000-4000-8000-000000000002';

  await prisma.user.upsert({
    where: { id: buyerId },
    update: {},
    create: {
      id: buyerId,
      email: 'buyer@example.com',
      name: 'Maya Driver',
      role: 'buyer',
    },
  });

  await prisma.user.upsert({
    where: { id: opsId },
    update: {},
    create: {
      id: opsId,
      email: 'ops@example.com',
      name: 'Jordan Ops',
      role: 'ops',
    },
  });

  const dealers = await Promise.all(
    [
      {
        id: 'dealer-evergreen',
        name: 'Evergreen Motors',
        city: 'Seattle',
        state: 'WA',
        contactName: 'Casey Verde',
        contactEmail: 'sales@evergreenmotors.com',
        phone: '+1-206-555-1234',
      },
      {
        id: 'dealer-sunset',
        name: 'Sunset Autohaus',
        city: 'Portland',
        state: 'OR',
        contactName: 'Louis Sunset',
        contactEmail: 'deals@sunsetautohaus.com',
        phone: '+1-503-555-9876',
      },
      {
        id: 'dealer-coastal',
        name: 'Coastal Drive',
        city: 'San Francisco',
        state: 'CA',
        contactName: 'Jamie Coast',
        contactEmail: 'hello@coastaldrive.com',
        phone: '+1-415-555-0001',
      },
    ].map((dealer) =>
      prisma.dealer.upsert({
        where: { id: dealer.id },
        update: {
          name: dealer.name,
          city: dealer.city,
          state: dealer.state,
          contactName: dealer.contactName,
          contactEmail: dealer.contactEmail,
          phone: dealer.phone,
        },
        create: dealer,
      })
    )
  );

  const brief = await prisma.brief.upsert({
    where: { id: 'brief-seed-1' },
    update: {},
    create: {
      id: 'brief-seed-1',
      buyerId,
      status: BriefStatus.sourcing,
      zipcode: '98109',
      paymentType: PaymentType.cash,
      paymentPreferences: [
        { type: 'cash' },
        { type: 'finance', downPayment: 5000, monthlyBudget: 650 },
      ],
      maxOTD: 52000,
      makes: ['Toyota'],
      models: ['Grand Highlander'],
      trims: ['Limited'],
      colors: ['Cloudburst Gray', 'Black'],
      mustHaves: ['Captain seats', 'Tow package'],
      timelinePreference: 'Ready to purchase within 30 days',
    },
  });

  await prisma.timelineEvent.upsert({
    where: { id: 'timeline-brief-created' },
    update: {},
    create: {
      id: 'timeline-brief-created',
      briefId: brief.id,
      type: 'brief_created',
      actor: 'buyer',
      payload: { note: 'Seed brief created' },
    },
  });

  await Promise.all(
    dealers.map((dealer, index) =>
      prisma.dealerInvite.upsert({
        where: { magicLinkToken: `seed-token-${index}` },
        update: {},
        create: {
          briefId: brief.id,
          dealerId: dealer.id,
          magicLinkToken: `seed-token-${index}`,
          state: DealerInviteState.sent,
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
          createdById: opsId,
        },
      })
    )
  );

  const quoteId = 'seed-quote-1';
  const invite = await prisma.dealerInvite.findFirstOrThrow({ where: { magicLinkToken: 'seed-token-0' } });

  await prisma.quote.upsert({
    where: { id: quoteId },
    update: {},
    create: {
      id: quoteId,
      briefId: brief.id,
      dealerId: invite.dealerId,
      inviteId: invite.id,
      status: QuoteStatus.published,
      vin: '1ABCDEFG2H3I45678',
      stockNumber: 'EVE1234',
      year: 2025,
      make: 'Toyota',
      model: 'Grand Highlander',
      trim: 'Limited',
      extColor: 'Cloudburst Gray',
      intColor: 'Black',
      etaDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      msrp: 50405,
      dealerDiscount: -1500,
      docFee: 150,
      dmvFee: 180,
      tireBatteryFee: 25,
      otherFeesTotal: 200,
      incentivesTotal: -1000,
      addonsTotal: 0,
      taxRate: 0.1025,
      taxAmount: 5020.4,
      otdTotal: 50100,
      paymentType: PaymentType.cash,
      confidence: 0.92,
      source: QuoteSource.dealer_form,
      lines: {
        createMany: {
          data: [
            { id: randomUUID(), kind: QuoteLineKind.incentive, name: 'Toyota Cash', amount: -750 },
            { id: randomUUID(), kind: QuoteLineKind.incentive, name: 'Holiday Bonus', amount: -250 },
            { id: randomUUID(), kind: QuoteLineKind.fee, name: 'Doc Fee', amount: 150 },
            { id: randomUUID(), kind: QuoteLineKind.fee, name: 'DMV', amount: 180 },
          ],
        },
      },
    },
  });

  await prisma.timelineEvent.upsert({
    where: { id: 'timeline-quote-submitted' },
    update: {},
    create: {
      id: 'timeline-quote-submitted',
      briefId: brief.id,
      quoteId: quoteId,
      type: 'quote_submitted',
      actor: 'dealer',
      payload: { dealer: dealers[0].name },
    },
  });

  await prisma.contract.upsert({
    where: { id: 'seed-contract' },
    update: {},
    create: {
      id: 'seed-contract',
      quoteId,
      status: ContractStatus.uploaded,
      checks: { status: 'pending' },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
