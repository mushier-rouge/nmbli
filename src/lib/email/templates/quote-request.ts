interface QuoteRequestData {
  dealerName: string;
  buyerName?: string;
  make: string;
  model: string;
  trim?: string;
  zipcode: string;
  maxOTD: number;
  timeline: string;
  paymentType: string;
  downPayment?: number;
  monthlyBudget?: number;
}

export function generateQuoteRequestEmail(data: QuoteRequestData): { subject: string; html: string; text: string } {
  const {
    dealerName,
    buyerName = 'A customer',
    make,
    model,
    trim,
    zipcode,
    maxOTD,
    timeline,
    paymentType,
    downPayment,
    monthlyBudget,
  } = data;

  const vehicleDescription = trim ? `${make} ${model} ${trim}` : `${make} ${model}`;

  const subject = `Quote Request: ${vehicleDescription}`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #333;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background-color: #2563eb;
      color: white;
      padding: 20px;
      border-radius: 5px 5px 0 0;
    }
    .content {
      background-color: #f9fafb;
      padding: 20px;
      border: 1px solid #e5e7eb;
    }
    .detail-row {
      padding: 10px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .detail-label {
      font-weight: bold;
      color: #4b5563;
    }
    .cta-button {
      background-color: #2563eb;
      color: white;
      padding: 12px 24px;
      text-decoration: none;
      border-radius: 5px;
      display: inline-block;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>New Quote Request from Nmbli</h1>
    </div>
    <div class="content">
      <p>Hello ${dealerName} Team,</p>

      <p>${buyerName} is interested in purchasing a ${vehicleDescription} and is requesting your best out-the-door (OTD) quote.</p>

      <h3>Customer Requirements:</h3>

      <div class="detail-row">
        <span class="detail-label">Vehicle:</span> ${vehicleDescription}
      </div>

      <div class="detail-row">
        <span class="detail-label">Location:</span> ${zipcode}
      </div>

      <div class="detail-row">
        <span class="detail-label">Max OTD Budget:</span> $${maxOTD.toLocaleString()}
      </div>

      <div class="detail-row">
        <span class="detail-label">Payment Type:</span> ${paymentType}
      </div>

      ${downPayment ? `
      <div class="detail-row">
        <span class="detail-label">Down Payment:</span> $${downPayment.toLocaleString()}
      </div>
      ` : ''}

      ${monthlyBudget ? `
      <div class="detail-row">
        <span class="detail-label">Target Monthly Payment:</span> $${monthlyBudget.toLocaleString()}
      </div>
      ` : ''}

      <div class="detail-row">
        <span class="detail-label">Timeline:</span> ${timeline}
      </div>

      <h3>What We Need:</h3>
      <ul>
        <li>Itemized out-the-door quote (vehicle price, fees, taxes, etc.)</li>
        <li>Available inventory that matches these requirements</li>
        <li>Any current promotions or incentives</li>
        <li>Delivery timeframe</li>
      </ul>

      <p>Please reply to this email with your best quote. The buyer will review all quotes and make a decision quickly.</p>

      <p><strong>Why Nmbli?</strong> We're helping car buyers collect transparent, itemized quotes from multiple dealers so they can make informed decisions. This is a serious buyer actively comparing quotes.</p>

      <a href="mailto:${process.env.GMAIL_FROM_EMAIL || 'contact@nmbli.com'}" class="cta-button">Reply with Your Quote</a>

      <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
        Thank you,<br>
        Nmbli Team<br>
        <a href="https://nmbli.com">nmbli.com</a>
      </p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Hello ${dealerName} Team,

${buyerName} is interested in purchasing a ${vehicleDescription} and is requesting your best out-the-door (OTD) quote.

CUSTOMER REQUIREMENTS:
- Vehicle: ${vehicleDescription}
- Location: ${zipcode}
- Max OTD Budget: $${maxOTD.toLocaleString()}
- Payment Type: ${paymentType}
${downPayment ? `- Down Payment: $${downPayment.toLocaleString()}` : ''}
${monthlyBudget ? `- Target Monthly Payment: $${monthlyBudget.toLocaleString()}` : ''}
- Timeline: ${timeline}

WHAT WE NEED:
- Itemized out-the-door quote (vehicle price, fees, taxes, etc.)
- Available inventory that matches these requirements
- Any current promotions or incentives
- Delivery timeframe

Please reply to this email with your best quote. The buyer will review all quotes and make a decision quickly.

Why Nmbli? We're helping car buyers collect transparent, itemized quotes from multiple dealers so they can make informed decisions. This is a serious buyer actively comparing quotes.

Thank you,
Nmbli Team
https://nmbli.com
  `.trim();

  return { subject, html, text };
}

export function generateFollowUpEmail(dealerName: string, vehicleDescription: string): { subject: string; html: string; text: string } {
  const subject = `Following up: Quote Request for ${vehicleDescription}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <p>Hello ${dealerName} Team,</p>

    <p>I wanted to follow up on the quote request I sent for the ${vehicleDescription}.</p>

    <p>The customer is actively reviewing quotes from multiple dealerships and is ready to make a decision soon. If you're able to provide a competitive out-the-door quote, please reply at your earliest convenience.</p>

    <p>If you need any additional information or have questions, please let me know.</p>

    <p style="margin-top: 30px;">
      Thank you,<br>
      Nmbli Team<br>
      <a href="https://nmbli.com">nmbli.com</a>
    </p>
  </div>
</body>
</html>
  `;

  const text = `
Hello ${dealerName} Team,

I wanted to follow up on the quote request I sent for the ${vehicleDescription}.

The customer is actively reviewing quotes from multiple dealerships and is ready to make a decision soon. If you're able to provide a competitive out-the-door quote, please reply at your earliest convenience.

If you need any additional information or have questions, please let me know.

Thank you,
Nmbli Team
https://nmbli.com
  `.trim();

  return { subject, html, text };
}
