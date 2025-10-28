import { prisma } from '../src/lib/prisma';

async function main() {
  const briefId = process.argv[2];

  if (!briefId) {
    console.error('Usage: npx tsx scripts/check-brief-dealers.ts <briefId>');
    process.exit(1);
  }

  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    include: {
      dealerProspects: true,
    },
  });

  if (!brief) {
    console.error(`Brief ${briefId} not found`);
    process.exit(1);
  }

  console.log('\n=== Brief Status ===');
  console.log(`ID: ${brief.id}`);
  console.log(`Status: ${brief.status}`);
  console.log(`Created: ${brief.createdAt}`);
  console.log(`Updated: ${brief.updatedAt}`);
  console.log(`\nMakes: ${JSON.stringify(brief.makes)}`);
  console.log(`Models: ${JSON.stringify(brief.models)}`);
  console.log(`Zipcode: ${brief.zipcode}`);

  console.log(`\n=== Dealer Prospects (${brief.dealerProspects.length}) ===`);
  brief.dealerProspects.forEach((dealer, i) => {
    console.log(`\n${i + 1}. ${dealer.name}`);
    console.log(`   Address: ${dealer.address}`);
    console.log(`   City: ${dealer.city}, ${dealer.state} ${dealer.zipcode}`);
    console.log(`   Contact Status: ${dealer.contactStatus}`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
