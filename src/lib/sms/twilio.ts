import twilio from 'twilio';
import type TwilioRestClient from 'twilio/lib/rest/Twilio';
import type { MessageInstance } from 'twilio/lib/rest/api/v2010/account/message';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface SMSParams {
  to: string;
  body: string;
}

export class TwilioClient {
  private client: TwilioRestClient | null;

  constructor() {
    // Lazy initialization - only create client when needed
    this.client = null;
  }

  private getClient(): TwilioRestClient {
    if (!this.client) {
      if (!ACCOUNT_SID || !AUTH_TOKEN) {
        throw new Error('Twilio credentials not configured');
      }
      this.client = twilio(ACCOUNT_SID, AUTH_TOKEN);
    }
    return this.client;
  }

  async sendSMS(params: SMSParams): Promise<string> {
    const { to, body } = params;

    if (!PHONE_NUMBER) {
      throw new Error('TWILIO_PHONE_NUMBER not configured');
    }

    const client = this.getClient();
    const message = await client.messages.create({
      body,
      from: PHONE_NUMBER,
      to,
    });

    return message.sid;
  }

  async getMessageStatus(messageSid: string): Promise<MessageInstance> {
    const client = this.getClient();
    return client.messages(messageSid).fetch();
  }
}

export const twilioClient = new TwilioClient();
