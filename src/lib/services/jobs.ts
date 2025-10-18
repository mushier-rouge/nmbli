import { Queue } from 'bullmq';

let contractDiffQueue: Queue | null = null;

function getConnection() {
  const url = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL;
  if (!url) {
    return null;
  }

  return {
    connection: {
      url,
      port: undefined,
      host: undefined,
      username: process.env.UPSTASH_REDIS_REST_USERNAME,
      password: process.env.UPSTASH_REDIS_REST_TOKEN,
    },
  };
}

function getContractDiffQueue() {
  if (contractDiffQueue) return contractDiffQueue;
  const connection = getConnection();
  if (!connection) {
    console.info('Redis connection not configured; background jobs will run inline.');
    return null;
  }

  contractDiffQueue = new Queue('contract_diff', connection);
  return contractDiffQueue;
}

export async function enqueueContractDiff(contractId: string) {
  const queue = getContractDiffQueue();
  if (!queue) {
    console.info('Queue unavailable; contract diff needs to be handled manually for', contractId);
    return;
  }

  await queue.add('contract_diff', { contractId }, { attempts: 3, backoff: { type: 'exponential', delay: 1000 } });
}

export async function enqueueInviteReminder(inviteId: string) {
  const queue = getContractDiffQueue();
  if (!queue) {
    console.info('Queue unavailable; invite reminder not enqueued for', inviteId);
    return;
  }

  await queue.add('invite_reminder', { inviteId }, { delay: 1000 * 60 * 60 * 12, attempts: 1 });
}
