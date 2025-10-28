import { briefAutomation } from '../src/lib/services/brief-automation';

async function main() {
  const briefId = process.argv[2];

  if (!briefId) {
    console.error('Usage: npx tsx scripts/manual-trigger-automation.ts <briefId>');
    process.exit(1);
  }

  console.log(`\n=== Manually triggering automation for brief ${briefId} ===\n`);

  try {
    await briefAutomation.processBrief(briefId);
    console.log('\n✅ Automation completed successfully');
  } catch (error) {
    console.error('\n❌ Automation failed:', error);
    process.exit(1);
  }
}

main();
