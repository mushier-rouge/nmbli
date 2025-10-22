import { describe, it, expect } from 'vitest';
import {
  generateQuoteRequestEmail,
  generateFollowUpEmail,
} from '@/lib/email/templates/quote-request';

describe('Email Templates - Quote Request', () => {
  it('should generate quote request email with all fields', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Smith Toyota',
      buyerName: 'John Doe',
      make: 'Toyota',
      model: 'Camry',
      trim: 'XSE',
      zipcode: '90210',
      maxOTD: 35000,
      timeline: 'Within 2 weeks',
      paymentType: 'lease',
      downPayment: 3000,
      monthlyBudget: 450,
    });

    expect(email.subject).toBe('Quote Request: Toyota Camry XSE');
    expect(email.html).toContain('Smith Toyota Team');
    expect(email.html).toContain('John Doe');
    expect(email.html).toContain('Toyota Camry XSE');
    expect(email.html).toContain('90210');
    expect(email.html).toContain('$35,000');
    expect(email.html).toContain('lease');
    expect(email.html).toContain('$3,000');
    expect(email.html).toContain('$450');
    expect(email.html).toContain('Within 2 weeks');
    expect(email.text).toContain('Toyota Camry XSE');
  });

  it('should generate email without optional trim', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Johnson Honda',
      make: 'Honda',
      model: 'Accord',
      zipcode: '10001',
      maxOTD: 30000,
      timeline: 'ASAP',
      paymentType: 'cash',
    });

    expect(email.subject).toBe('Quote Request: Honda Accord');
    expect(email.html).toContain('Honda Accord');
    expect(email.html).not.toContain('Honda Accord undefined');
  });

  it('should default to "A customer" when buyerName not provided', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Toyota',
      model: 'RAV4',
      zipcode: '90001',
      maxOTD: 40000,
      timeline: '1 month',
      paymentType: 'finance',
    });

    expect(email.html).toContain('A customer is interested');
    expect(email.text).toContain('A customer is interested');
  });

  it('should format large numbers with commas', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Luxury Motors',
      make: 'BMW',
      model: 'X5',
      zipcode: '90210',
      maxOTD: 85000,
      timeline: 'Within 1 week',
      paymentType: 'lease',
      downPayment: 10000,
      monthlyBudget: 1200,
    });

    expect(email.html).toContain('$85,000');
    expect(email.html).toContain('$10,000');
    expect(email.html).toContain('$1,200');
    expect(email.text).toContain('$85,000');
  });

  it('should include payment preferences when provided', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Honda',
      model: 'Civic',
      zipcode: '60601',
      maxOTD: 28000,
      timeline: 'Flexible',
      paymentType: 'finance',
      downPayment: 5000,
      monthlyBudget: 400,
    });

    expect(email.html).toContain('Down Payment');
    expect(email.html).toContain('$5,000');
    expect(email.html).toContain('Target Monthly Payment');
    expect(email.html).toContain('$400');
  });

  it('should not include payment preferences when not provided', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Honda',
      model: 'Civic',
      zipcode: '60601',
      maxOTD: 28000,
      timeline: 'Flexible',
      paymentType: 'cash',
    });

    expect(email.html).not.toContain('Down Payment');
    expect(email.html).not.toContain('Target Monthly Payment');
  });

  it('should include all required sections in HTML', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Ford',
      model: 'F-150',
      zipcode: '75201',
      maxOTD: 55000,
      timeline: '2-3 weeks',
      paymentType: 'finance',
    });

    expect(email.html).toContain('<!DOCTYPE html>');
    expect(email.html).toContain('Customer Requirements:');
    expect(email.html).toContain('What We Need:');
    expect(email.html).toContain('Why Nmbli?');
    expect(email.html).toContain('Nmbli Team');
    expect(email.html).toContain('nmbli.com');
  });

  it('should include call-to-action button', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Toyota',
      model: 'Tacoma',
      zipcode: '98101',
      maxOTD: 45000,
      timeline: 'Within 1 month',
      paymentType: 'cash',
    });

    expect(email.html).toContain('Reply with Your Quote');
    expect(email.html).toContain('mailto:');
  });

  it('should have matching content in HTML and text versions', () => {
    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      buyerName: 'Jane Smith',
      make: 'Mazda',
      model: 'CX-5',
      trim: 'Touring',
      zipcode: '02101',
      maxOTD: 32000,
      timeline: 'ASAP',
      paymentType: 'lease',
      downPayment: 2500,
      monthlyBudget: 380,
    });

    expect(email.text).toContain('Jane Smith');
    expect(email.text).toContain('Mazda CX-5 Touring');
    expect(email.text).toContain('02101');
    expect(email.text).toContain('$32,000');
    expect(email.text).toContain('lease');
    expect(email.text).toContain('$2,500');
    expect(email.text).toContain('$380');
    expect(email.text).toContain('ASAP');
  });

  it('should properly escape HTML in dealer name', () => {
    const email = generateQuoteRequestEmail({
      dealerName: "Smith's <Auto> & Trucks",
      make: 'Ford',
      model: 'Ranger',
      zipcode: '12345',
      maxOTD: 35000,
      timeline: '1 week',
      paymentType: 'cash',
    });

    // Should contain the dealer name
    expect(email.html).toContain("Smith's <Auto> & Trucks");
  });

  it('should handle very long timeline text', () => {
    const longTimeline = 'Looking to purchase within the next 2-3 months, but willing to wait for the right deal with the exact specifications needed';

    const email = generateQuoteRequestEmail({
      dealerName: 'Test Dealer',
      make: 'Toyota',
      model: 'Highlander',
      zipcode: '90001',
      maxOTD: 50000,
      timeline: longTimeline,
      paymentType: 'finance',
    });

    expect(email.html).toContain(longTimeline);
    expect(email.text).toContain(longTimeline);
  });
});

describe('Email Templates - Follow Up', () => {
  it('should generate follow up email with dealer name and vehicle', () => {
    const email = generateFollowUpEmail('Smith Toyota', 'Toyota Camry XSE');

    expect(email.subject).toBe('Following up: Quote Request for Toyota Camry XSE');
    expect(email.html).toContain('Smith Toyota Team');
    expect(email.html).toContain('Toyota Camry XSE');
    expect(email.html).toContain('follow up');
    expect(email.text).toContain('Smith Toyota Team');
    expect(email.text).toContain('Toyota Camry XSE');
  });

  it('should include urgency messaging', () => {
    const email = generateFollowUpEmail('Test Dealer', 'Honda Accord');

    expect(email.html).toContain('actively reviewing quotes');
    expect(email.html).toContain('ready to make a decision soon');
    expect(email.text).toContain('actively reviewing quotes');
    expect(email.text).toContain('ready to make a decision soon');
  });

  it('should include signature and branding', () => {
    const email = generateFollowUpEmail('Test Dealer', 'Ford F-150');

    expect(email.html).toContain('Nmbli Team');
    expect(email.html).toContain('nmbli.com');
    expect(email.text).toContain('Nmbli Team');
    expect(email.text).toContain('nmbli.com');
  });

  it('should have simpler structure than quote request', () => {
    const email = generateFollowUpEmail('Test Dealer', 'Toyota RAV4');

    // Should not contain detailed requirements sections
    expect(email.html).not.toContain('Customer Requirements:');
    expect(email.html).not.toContain('What We Need:');
    expect(email.html).not.toContain('Why Nmbli?');
  });

  it('should be polite and professional', () => {
    const email = generateFollowUpEmail('Luxury Motors', 'BMW X5');

    expect(email.html).toContain('Thank you');
    expect(email.html).toContain('please');
    expect(email.text).toContain('Thank you');
    expect(email.text).toContain('please');
  });

  it('should handle vehicle descriptions with special characters', () => {
    const email = generateFollowUpEmail('Test Dealer', "Ford F-150 King Ranch™");

    expect(email.subject).toContain("Ford F-150 King Ranch™");
    expect(email.html).toContain("Ford F-150 King Ranch™");
  });
});
