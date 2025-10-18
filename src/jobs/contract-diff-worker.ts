import { Worker } from 'bullmq';

import { checkContractAgainstQuote } from '@/lib/services/contracts';
import type { ContractDiffInput } from '@/lib/validation/contract';

const connectionUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;

if (!connectionUrl) {
  console.info('Redis connection not configured. Contract diff worker will not start.');
} else {
  const worker = new Worker(
    'contract_diff',
    async (job) => {
      const { contractId, diffInput } = job.data as { contractId: string; diffInput?: ContractDiffInput };
      if (!diffInput) {
        console.warn('Contract diff job missing diff input', job.data);
        return;
      }
      await checkContractAgainstQuote({ contractId, input: diffInput });
    },
    {
      connection: {
        url: connectionUrl,
        username: process.env.UPSTASH_REDIS_REST_USERNAME,
        password: process.env.UPSTASH_REDIS_REST_TOKEN,
      },
    }
  );

  worker.on('completed', (job) => {
    console.info('Contract diff job completed', job.id);
  });

  worker.on('failed', (job, err) => {
    console.error('Contract diff job failed', job?.id, err);
  });
}
