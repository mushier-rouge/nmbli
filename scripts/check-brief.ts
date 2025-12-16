
import { PrismaClient } from '../src/generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// Handle potentially quoted/newlined key if reading from raw .env file manually
// But dotenv usually handles quotes. 
// Just in case, we can manually override if needed, but let's try standard first.

const prisma = new PrismaClient();

async function main() {
    console.log(`Debug: Process DATABASE_URL: ${process.env.DATABASE_URL}`);

    // List last 10 briefs created globally
    const recentBriefs = await prisma.brief.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { buyer: true }
    });

    console.log(`\n--- Last 10 Briefs Globally ---`);
    recentBriefs.forEach(b => {
        console.log(`[${b.id}] ${b.status} | Created: ${b.createdAt.toISOString()} | Owner: ${b.buyer.email}`);
    });
    console.log(`-------------------------------\n`);

    const targetId = 'E95D6284-F1D6-4E15-9610-1869E464764B'; // Case sensitive check first
    console.log(`Searching globally for Brief ID: ${targetId}`);

    const brief = await prisma.brief.findUnique({
        where: { id: targetId },
        include: { buyer: true }
    });

    if (brief) {
        console.log(`✅ FOUND BRIEF!`);
        console.log(`   ID: ${brief.id}`);
        console.log(`   Owner Email: ${brief.buyer.email}`);
        console.log(`   Owner ID: ${brief.buyerId}`);
        console.log(`   Created At: ${brief.createdAt}`);
    } else {
        // Try case insensitive search
        const globalMatch = await prisma.brief.findFirst({
            where: { id: { equals: targetId, mode: 'insensitive' } },
            include: { buyer: true }
        });

        if (globalMatch) {
            console.log(`✅ FOUND BRIEF (Case Insensitive)!`);
            console.log(`   ID: ${globalMatch.id}`);
            console.log(`   Owner Email: ${globalMatch.buyer.email}`);
        } else {
            console.log(`❌ Brief ${targetId} NOT found in this database.`);
            console.log(`Checked DATABASE_URL: ${process.env.DATABASE_URL?.split('@')[1]}`); // Log host to confirm environment
        }
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
