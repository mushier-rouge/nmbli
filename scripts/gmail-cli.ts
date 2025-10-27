#!/usr/bin/env ts-node
import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';

const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
const DEFAULT_CREDENTIALS_PATH = path.join(process.cwd(), 'gmail-credentials.json');
async function getClient() {
  const credentialsPath = process.env.GMAIL_CREDENTIALS_PATH || DEFAULT_CREDENTIALS_PATH;
  try {
    await fs.access(credentialsPath);
  } catch (error) {
    throw new Error(`Credentials file not found at ${credentialsPath}. Set GMAIL_CREDENTIALS_PATH or place gmail-credentials.json in project root.`);
  }

  const authClient = (await authenticate({
    scopes: SCOPES,
    keyfilePath: credentialsPath,
  })) as OAuth2Client;

  google.options({ auth: authClient });
  return google.gmail({ version: 'v1', auth: authClient });
}

function buildRawMessage({ from, to, subject, text }: { from: string; to: string; subject: string; text: string }) {
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    text,
  ].join('\r\n');

  return Buffer.from(message, 'utf-8').toString('base64url');
}

async function sendMessage(to: string, subject: string, text: string) {
  const gmail = await getClient();
  const raw = buildRawMessage({
    from: 'nmbli <contact@nmbli.com>',
    to,
    subject,
    text,
  });

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw },
  });

  console.log(`Sent message to ${to}`);
}

async function listThreads(query: string, maxResults: number) {
  const gmail = await getClient();
  const res = await gmail.users.threads.list({
    userId: 'me',
    q: query,
    maxResults,
  });

  if (!res.data.threads || res.data.threads.length === 0) {
    console.log('No threads found.');
    return;
  }

  for (const thread of res.data.threads) {
    console.log(`Thread ${thread.id} — snippet: ${thread.snippet}`);
  }
}

async function main() {
  const [command = 'help', ...args] = process.argv.slice(2);

  if (command === 'send') {
    const to = args[0] || process.env.GMAIL_TO || 'dealer@example.com';
    const subject = args[1] || process.env.GMAIL_SUBJECT || 'Quick question about inventory';
    const body = args.slice(2).join(' ') || process.env.GMAIL_BODY || 'Howdy – just checking availability on the 2024 Camry XSE. Thanks!';
    await sendMessage(to, subject, body);
    return;
  }

  if (command === 'threads') {
    const query = args[0] || process.env.GMAIL_QUERY || 'in:inbox';
    const maxResults = Number(args[1] || process.env.GMAIL_MAX_RESULTS || 10);
    await listThreads(query, maxResults);
    return;
  }

  console.log(`Usage:
  ts-node scripts/gmail-cli.ts send dealer@example.com "Subject" "Body text"
  ts-node scripts/gmail-cli.ts threads "in:sent" 5
Environment:
  GMAIL_CREDENTIALS_PATH — optional path to OAuth client credentials JSON.
  GMAIL_TO / GMAIL_SUBJECT / GMAIL_BODY / GMAIL_QUERY / GMAIL_MAX_RESULTS — optional defaults.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
