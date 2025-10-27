import { prisma } from '../src/lib/prisma';

async function debugBriefData() {
  console.log('Fetching all briefs...');

  const briefs = await prisma.brief.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  console.log('\n=== Brief Data Debug ===\n');

  for (const brief of briefs) {
    console.log(`Brief ID: ${brief.id}`);
    console.log(`Makes type: ${typeof brief.makes}, Array: ${Array.isArray(brief.makes)}`);
    console.log(`Makes value:`, JSON.stringify(brief.makes));
    console.log(`Makes[0] type: ${typeof brief.makes[0]}`);
    console.log(`Makes[0] value:`, JSON.stringify(brief.makes[0]));

    console.log(`\nModels type: ${typeof brief.models}, Array: ${Array.isArray(brief.models)}`);
    console.log(`Models value:`, JSON.stringify(brief.models));

    console.log(`\nMustHaves type: ${typeof brief.mustHaves}, Array: ${Array.isArray(brief.mustHaves)}`);
    console.log(`MustHaves value:`, JSON.stringify(brief.mustHaves));

    console.log(`\nPaymentPreferences type: ${typeof brief.paymentPreferences}`);
    console.log(`PaymentPreferences value:`, JSON.stringify(brief.paymentPreferences));

    console.log(`\nStatus type: ${typeof brief.status}`);
    console.log(`Status value:`, JSON.stringify(brief.status));

    console.log('\n---\n');
  }

  await prisma.$disconnect();
}

debugBriefData().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
