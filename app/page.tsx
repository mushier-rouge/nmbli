'use client';

import { FormEvent, useState } from 'react';
import { supabaseClient } from '../lib/supabase-client';

interface StatusState {
  tone: 'idle' | 'loading' | 'success' | 'error';
  message: string;
}

export default function HomePage() {
  const [status, setStatus] = useState<StatusState>({ tone: 'idle', message: '' });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabaseClient) {
      setStatus({
        tone: 'error',
        message: 'Signup is not available yet. Please try again later.',
      });
      return;
    }

    const form = event.currentTarget;
    const formData = new FormData(form);
    const email = (formData.get('email') ?? '').toString().trim();
    const location = (formData.get('location') ?? '').toString().trim() || null;
    const brief = (formData.get('brief') ?? '').toString().trim();

    if (!email || !brief) {
      setStatus({ tone: 'error', message: 'Email and brief are required.' });
      return;
    }

    setStatus({ tone: 'loading', message: 'Submitting…' });

    const { error } = await supabaseClient
      .from('waitlist_signups')
      .insert({ email, location, brief });

    if (error) {
      console.error(error);
      setStatus({
        tone: 'error',
        message: 'Something went wrong. Email contact@nmbli.com and we will get you on the list.',
      });
      return;
    }

    form.reset();
    setStatus({
      tone: 'success',
      message: 'Thanks! Check your inbox for a confirmation email.',
    });
  };

  return (
    <div className="page">
      <header>
        <span className="brand">Nmbli</span>
        <div className="chip">Pilot recruiting now</div>
      </header>

      <section className="hero">
        <div className="grid">
          <h1>The car buying assistant that enforces your out-the-door price.</h1>
          <p>
            Send us your brief and we reach out to dealerships on your behalf. We collect itemized quotes,
            normalize the numbers, run the counteroffers, and lock the contract to the price you approved.
            No showroom pressure, no last-minute fees—just the keys.
          </p>
          <div className="chips">
            <span className="chip">Verified OTD quotes</span>
            <span className="chip">Contract ≠? Quote — we stop it</span>
            <span className="chip">Negotiation without the phone tag</span>
          </div>
        </div>
        <div className="pilot-card">
          <strong>Metro pilot · 48h turnaround</strong>
          <span>We’re onboarding buyers in select launch metros and calling dealerships for them.</span>
        </div>
      </section>

      <section className="grid two">
        <article className="card">
          <h2>We handle the dealer legwork</h2>
          <p>
            Your brief arrives with intent, budget, and timing. We turn it into a structured quote request,
            call the right dealerships, chase down paperwork, and keep the conversation moving while you
            stay out of the showroom.
          </p>
          <ul>
            <li>Request itemized worksheets: taxes, fees, add-ons, rebates</li>
            <li>Follow up on counters until the numbers align</li>
            <li>Confirm the contract matches before you ever sign</li>
          </ul>
        </article>
        <article className="card">
          <h2>Guardrails for buyers</h2>
          <p>
            We parse every document before e-sign. If the contract drifts from the accepted quote, we flag
            it and block the signing flow until it’s clean.
          </p>
          <ul>
            <li>Clear timeline of every quote, counter, and approval</li>
            <li>Automated add-on removal with transparent diffs</li>
            <li>No-surprise pledge backed by human review</li>
          </ul>
        </article>
      </section>

      <section className="card" id="waitlist">
        <h2>Join the pilot waitlist</h2>
        <p>
          Tell us where you are and how soon you need the car. We’ll reach out when a slot opens in your
          metro and start contacting dealerships to pull together clean, itemized quotes for you.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
          </label>
          <label>
            Metro or ZIP (optional)
            <input type="text" name="location" placeholder="e.g. 94105" autoComplete="postal-code" />
          </label>
          <label>
            What are you shopping for?
            <textarea
              name="brief"
              placeholder="2025 RAV4 XSE, leasing, want delivery before December"
              required
            />
          </label>
          <button type="submit" disabled={status.tone === 'loading'}>
            {status.tone === 'loading' ? 'Submitting…' : 'Reserve a spot'}
          </button>
          <p className="form-footnote">
            We’ll email to confirm your request and share next steps. No spam, ever.
          </p>
          {status.tone !== 'idle' ? (
            <p className={`status ${status.tone === 'success' ? 'success' : ''} ${status.tone === 'error' ? 'error' : ''}`}>
              {status.message}
            </p>
          ) : null}
        </form>
      </section>

      <footer>
        <span>© {new Date().getFullYear()} Nmbli. All rights reserved.</span>
        <a href="mailto:contact@nmbli.com">contact@nmbli.com</a>
      </footer>
    </div>
  );
}
