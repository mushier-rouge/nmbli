'use client';

import { FormEvent, useState } from 'react';
import { supabaseClient } from '../lib/supabase-client';
import { isValidZip } from '../lib/zip';

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
    const zip = (formData.get('zip') ?? '').toString().trim();

    if (!email) {
      setStatus({ tone: 'error', message: 'Email is required.' });
      return;
    }

    if (!isValidZip(zip)) {
      setStatus({ tone: 'error', message: 'Enter a valid 5-digit ZIP (optional +4 allowed).' });
      return;
    }

    setStatus({ tone: 'loading', message: 'Submitting…' });

    const { error } = await supabaseClient
      .from('waitlist_signups')
      .insert({
        email,
        location: zip,
        brief: 'Zip waitlist signup',
      });

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
          <h1>We reach out to dealerships for you.</h1>
          <p>
            Share your contact info. We reach out to dealerships, gather clean out-the-door quotes, and
            make sure the contract never drifts from the number you approve.
          </p>
          <div className="chips">
            <span className="chip">Dealer outreach handled</span>
            <span className="chip">Itemized OTD pricing</span>
            <span className="chip">Contract = quote</span>
          </div>
        </div>
        <div className="pilot-card">
          <strong>Pilot waitlist</strong>
          <span>Invite-only concierge. Join the list and we’ll reach out when your metro opens.</span>
        </div>
      </section>

      <section className="card" id="waitlist">
        <h2>Join the pilot waitlist</h2>
        <p>
          Drop your email and ZIP code. When your slot opens, we reach out to the dealerships and send you
          the cleaned-up quotes.
        </p>
        <form onSubmit={handleSubmit} noValidate>
          <label>
            Email
            <input type="email" name="email" placeholder="you@example.com" required autoComplete="email" />
          </label>
          <label>
            ZIP code
            <input type="text" name="zip" placeholder="e.g. 94105" inputMode="numeric" autoComplete="postal-code" required />
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
