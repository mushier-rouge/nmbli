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
                // dealerId is null - these are discovered dealerships, not registered dealers
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

// Zip code prefix to state mapping
// Based on USPS zip code ranges
const ZIP_TO_STATE_MAP: { [prefix: string]: string } = {
  // California
  '900': 'CA', '901': 'CA', '902': 'CA', '903': 'CA', '904': 'CA', '905': 'CA',
  '906': 'CA', '907': 'CA', '908': 'CA', '910': 'CA', '911': 'CA', '912': 'CA',
  '913': 'CA', '914': 'CA', '915': 'CA', '916': 'CA', '917': 'CA', '918': 'CA',
  '919': 'CA', '920': 'CA', '921': 'CA', '922': 'CA', '923': 'CA', '924': 'CA',
  '925': 'CA', '926': 'CA', '927': 'CA', '928': 'CA', '930': 'CA', '931': 'CA',
  '932': 'CA', '933': 'CA', '934': 'CA', '935': 'CA', '936': 'CA', '937': 'CA',
  '938': 'CA', '939': 'CA', '940': 'CA', '941': 'CA', '942': 'CA', '943': 'CA',
  '944': 'CA', '945': 'CA', '946': 'CA', '947': 'CA', '948': 'CA', '949': 'CA',
  '950': 'CA', '951': 'CA', '952': 'CA', '953': 'CA', '954': 'CA', '955': 'CA',
  '956': 'CA', '957': 'CA', '958': 'CA', '959': 'CA', '960': 'CA', '961': 'CA',
  // Washington
  '980': 'WA', '981': 'WA', '982': 'WA', '983': 'WA', '984': 'WA', '985': 'WA',
  '986': 'WA', '988': 'WA', '989': 'WA', '990': 'WA', '991': 'WA', '992': 'WA',
  '993': 'WA', '994': 'WA',
  // Oregon
  '970': 'OR', '971': 'OR', '972': 'OR', '973': 'OR', '974': 'OR', '975': 'OR',
  '976': 'OR', '977': 'OR', '978': 'OR', '979': 'OR',
  // New York
  '100': 'NY', '101': 'NY', '102': 'NY', '103': 'NY', '104': 'NY', '105': 'NY',
  '106': 'NY', '107': 'NY', '108': 'NY', '109': 'NY', '110': 'NY', '111': 'NY',
  '112': 'NY', '113': 'NY', '114': 'NY', '115': 'NY', '116': 'NY', '117': 'NY',
  '118': 'NY', '119': 'NY', '120': 'NY', '121': 'NY', '122': 'NY', '123': 'NY',
  '124': 'NY', '125': 'NY', '126': 'NY', '127': 'NY', '128': 'NY', '129': 'NY',
  '130': 'NY', '131': 'NY', '132': 'NY', '133': 'NY', '134': 'NY', '135': 'NY',
  '136': 'NY', '137': 'NY', '138': 'NY', '139': 'NY', '140': 'NY', '141': 'NY',
  '142': 'NY', '143': 'NY', '144': 'NY', '145': 'NY', '146': 'NY', '147': 'NY',
  '148': 'NY', '149': 'NY',
  // Texas
  '750': 'TX', '751': 'TX', '752': 'TX', '753': 'TX', '754': 'TX', '755': 'TX',
  '756': 'TX', '757': 'TX', '758': 'TX', '759': 'TX', '760': 'TX', '761': 'TX',
  '762': 'TX', '763': 'TX', '764': 'TX', '765': 'TX', '766': 'TX', '767': 'TX',
  '768': 'TX', '769': 'TX', '770': 'TX', '771': 'TX', '772': 'TX', '773': 'TX',
  '774': 'TX', '775': 'TX', '776': 'TX', '777': 'TX', '778': 'TX', '779': 'TX',
  '780': 'TX', '781': 'TX', '782': 'TX', '783': 'TX', '784': 'TX', '785': 'TX',
  '786': 'TX', '787': 'TX', '788': 'TX', '789': 'TX', '790': 'TX', '791': 'TX',
  '792': 'TX', '793': 'TX', '794': 'TX', '795': 'TX', '796': 'TX', '797': 'TX',
  '798': 'TX', '799': 'TX',
  // Florida
  '320': 'FL', '321': 'FL', '322': 'FL', '323': 'FL', '324': 'FL', '325': 'FL',
  '326': 'FL', '327': 'FL', '328': 'FL', '329': 'FL', '330': 'FL', '331': 'FL',
  '332': 'FL', '333': 'FL', '334': 'FL', '335': 'FL', '336': 'FL', '337': 'FL',
  '338': 'FL', '339': 'FL', '340': 'FL', '341': 'FL', '342': 'FL', '344': 'FL',
  // Illinois
  '600': 'IL', '601': 'IL', '602': 'IL', '603': 'IL', '604': 'IL', '605': 'IL',
  '606': 'IL', '607': 'IL', '608': 'IL', '609': 'IL', '610': 'IL', '611': 'IL',
  '612': 'IL', '613': 'IL', '614': 'IL', '615': 'IL', '616': 'IL', '617': 'IL',
  '618': 'IL', '619': 'IL', '620': 'IL', '621': 'IL', '622': 'IL', '623': 'IL',
  '624': 'IL', '625': 'IL', '626': 'IL', '627': 'IL', '628': 'IL', '629': 'IL',
};

async function getStateFromZipcode(zipcode: string): Promise<string> {
  // Take first 3 digits of zip code
  const prefix = zipcode.slice(0, 3);
  const state = ZIP_TO_STATE_MAP[prefix];

  if (!state) {
    console.warn(`Unknown zip code prefix: ${prefix} for zipcode: ${zipcode}`);
    // Default to CA for now if unknown
    return 'CA';
  }

  return state;
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
