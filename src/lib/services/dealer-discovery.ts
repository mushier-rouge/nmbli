import { prisma } from '@/lib/prisma';
import { findDealersInState, type DealerInfo } from '@/lib/api/google-maps';
import { dealerInfoSchema } from '@/lib/validation/dealer';

export async function discoverDealersForBrief(briefId: string) {
  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    select: { makes: true, zipcode: true },
  });

  if (!brief) {
    throw new Error(`Brief ${briefId} not found`);
  }

  // Extract state from zipcode (simplified - you'd use a proper zip-to-state service)
  const state = await getStateFromZipcode(brief.zipcode);

  const allDealers: DealerInfo[] = [];

  // Find dealers for each make
  for (const make of brief.makes) {
    try {
      const dealers = await findDealersInState({ make, state, count: 15 });

      // Validate and store dealers
      for (const dealer of dealers) {
        try {
          const validatedDealer = dealerInfoSchema.parse({
            ...dealer,
            make,
          });

          // Check if dealer already exists
          let dealership = await prisma.dealership.findFirst({
            where: {
              name: validatedDealer.name,
              city: validatedDealer.city,
            },
          });

          if (!dealership) {
            dealership = await prisma.dealership.create({
              data: {
                name: validatedDealer.name,
                make,
                state: validatedDealer.state,
                city: validatedDealer.city,
                address: validatedDealer.address,
                zipcode: validatedDealer.zipcode,
                phone: validatedDealer.phone || null,
                website: validatedDealer.website || null,
                email: validatedDealer.email || null,
                verified: false,
              },
            });
          }

          // Create DealerProspect to link this dealership to the brief
          const existingProspect = await prisma.dealerProspect.findFirst({
            where: {
              briefId,
              name: dealership.name,
              city: dealership.city,
            },
          });

          if (!existingProspect) {
            await prisma.dealerProspect.create({
              data: {
                briefId,
                dealerId: dealership.id,
                name: dealership.name,
                brand: make,
                city: dealership.city,
                state: dealership.state,
                zipcode: dealership.zipcode,
                address: dealership.address,
                phone: dealership.phone,
                email: dealership.email,
                website: dealership.website,
                source: 'google_maps',
              },
            });
          }

          allDealers.push(validatedDealer);
        } catch (error) {
          console.error('Invalid dealer data:', error);
        }
      }
    } catch (error) {
      console.error(`Error finding ${make} dealers:`, error);
    }
  }

  return allDealers;
}

async function getStateFromZipcode(zipcode: string): Promise<string> {
  void zipcode; // placeholder until real lookup is implemented
  // Simplified - in production, use a proper zip code database or API
  // For now, hardcode for testing
  return 'WA';
}

export async function getDealersForBrief(briefId: string) {
  const brief = await prisma.brief.findUnique({
    where: { id: briefId },
    select: { makes: true, zipcode: true },
  });

  if (!brief) {
    throw new Error(`Brief ${briefId} not found`);
  }

  const state = await getStateFromZipcode(brief.zipcode);

  return prisma.dealership.findMany({
    where: {
      make: { in: brief.makes },
      state,
    },
    orderBy: { verified: 'desc' },
  });
}
