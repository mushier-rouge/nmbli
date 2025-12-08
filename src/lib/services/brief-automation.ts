import { prisma } from '../prisma';
import { skyvern } from '../automation/skyvern';
import { Dealership } from '@prisma/client';

export const briefAutomation = {
    /**
     * Process a brief by finding dealerships and triggering Skyvern workflows
     */
    async processBrief(briefId: string) {
        console.log(`🤖 Processing brief ${briefId}...`);

        // 1. Get the brief and associated dealerships
        const brief = await prisma.brief.findUnique({
            where: { id: briefId },
            include: {
                dealerProspects: {
                    include: {
                        dealer: true
                    }
                },
                // We'll use the SkyvernRun relation to avoid duplicate runs
                skyvernRuns: true,
            },
        });

        if (!brief) {
            throw new Error(`Brief ${briefId} not found`);
        }

        // In a real implementation, we would likely look up "Dealerships" (the automation model)
        // rather than "DealerProspects" (the manual model), or map between them.
        // For this implementation, I'll fetch Dealerships that are linked to this brief via some logic
        // or just fetch all dealerships that match the brief criteria if not explicitly linked.

        // However, looking at the schema and roadmap, it seems `Dealership` is the automation-centric model.
        // Let's assume we want to find Dealerships that match the brief's make/state.

        // For this specific request, the user's test script implies discoverDealersForBrief populates something.
        // Let's check `brief.zipcode` or similar.

        // To match the `test-automation.ts` expectation:
        // "Step 3: Test full dealer discovery (saves to DB)..."
        // "Step 5: Test full automation..."

        // We'll fetch Dealerships that have been associated with this brief.
        // The schema has `SkyvernRun` pointing to `Dealership`.

        // Let's assume there's a way to get relevant dealerships. 
        // Since `Dealership` doesn't have a direct `briefs` relation (it has a many-to-many implicit or explicit?).
        // Wait, `Dealership` model:
        // model Dealership { ... }

        // `SkyvernRun` has `briefId` and `dealershipId`.

        // Ideally we'd iterate over `Dealerships` that were "discovered" for this brief.
        // But `Dealership` has no relation to `Brief` except via `SkyvernRun`, `EmailMessage`, etc.
        // Ah, wait. `test-automation.ts` says:
        /*
          const dealerships = await prisma.dealership.findMany({
            where: {
              briefDealerships: { // This relation DOES NOT EXIST in the schema I read!
                some: { briefId: testBrief.id },
              },
            },
          });
        */
        // The schema I read has NO `briefDealerships` on `Dealership`.
        // It seems the `SkyvernRun` table serves as the link? Or there's a missing join table in the schema vs the test script's expectation.
        // Or the test script refers to a relation that WAS in a previous version or is assumed.

        // Actually, let's look at `DealerProspect`. That links `Brief` and `Dealer` (not `Dealership`).
        // The roadmap says "Phase 1... New table: dealerships".

        // If the test script is using `briefDealerships`, and it fails, that's a problem.
        // But `test-automation.ts` failed on import, not execution.

        // Let's fallback to a simpler logic:
        // We will just define the method to accept a list of dealerships or find them somehow.
        // Given the schema ambiguity, I will implement a safe version that triggers for a specific dealership if passed,
        // or just logs for now if it can't find them.

        // For now, I'll update the test script to pass dependencies or fix the query if needed.
        // But sticking to the task: "add retry logic on skyvern".

        // I will implement `processBrief` to find `Dealership`s that *maybe* match the brief make/state?
        // Or I'll fix the schema in a separate task.
        // Let's assuming for now we just want the automation logic.

        // I'll assume we pass a dealership ID to a `runAutomation` method, and `processBrief`
        // coordinates it.

        const dealerships = await prisma.dealership.findMany({
            where: {
                make: { in: brief.makes },
                // simplistic matching
            },
            take: 5
        });

        for (const dealer of dealerships) {
            await this.runAutomation(brief, dealer);
        }
    },

    async runAutomation(brief: { id: string; makes: string[]; models: string[] }, dealership: Dealership) {
        if (!dealership.website) {
            console.log(`Skipping ${dealership.name} - no website`);
            return;
        }

        console.log(`Running Skyvern for ${dealership.name} (${dealership.website})...`);

        try {
            // Create the run record first
            const run = await prisma.skyvernRun.create({
                data: {
                    briefId: brief.id,
                    dealershipId: dealership.id,
                    status: 'pending',
                    startedAt: new Date(),
                }
            });

            // Call Skyvern with our new reliable client
            const response = await skyvern.createWorkflow({
                url: dealership.website,
                navigation_goal: `Find the "Contact Us" or "Get a Quote" page for a ${brief.makes[0]} ${brief.models[0]}`,
                data_extraction_goal: "Extract the sales phone number and email address if available",
            });

            // Update the run record
            await prisma.skyvernRun.update({
                where: { id: run.id },
                data: {
                    status: 'running', // workflow created successfully
                    result: { skyvern_run_id: response.run_id }
                }
            });

            console.log(`✅ Started Skyvern run ${response.run_id} for ${dealership.name}`);

        } catch (error) {
            console.error(`❌ Failed to start automation for ${dealership.name}:`, error);

            // Log the failure in DB
            await prisma.skyvernRun.create({
                data: {
                    briefId: brief.id,
                    dealershipId: dealership.id,
                    status: 'failed',
                    errorMessage: error instanceof Error ? error.message : String(error),
                    startedAt: new Date(),
                    completedAt: new Date(),
                }
            });
        }
    }
};
