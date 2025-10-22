import twilio from 'twilio';

const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

export interface SMSParams {
  to: string;
  body: string;
}

export class TwilioClient {
  private client: any;

  constructor() {
    // Lazy initialization - only create client when needed
    this.client = null;
  }

  private getClient() {
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

  async getMessageStatus(messageSid: string) {
    const client = this.getClient();
    return client.messages(messageSid).fetch();
  }
}

export const twilioClient = new TwilioClient();
