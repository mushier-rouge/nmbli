'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';

interface SendQuotesButtonProps {
  briefId: string;
}

export function SendQuotesButton({ briefId }: SendQuotesButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const handleSendQuotes = async () => {
    setIsLoading(true);
    setStatus('idle');
    setMessage('');

    try {
      const response = await fetch(`/api/briefs/${briefId}/send-quotes`, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send quote requests');
      }

      setStatus('success');
      setMessage(`Quote requests sent to ${data.sent.length} dealers! Check your test email.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Failed to send quote requests');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={handleSendQuotes}
        disabled={isLoading || status === 'success'}
        variant={status === 'success' ? 'secondary' : 'default'}
      >
        {isLoading ? (
          <>
            <span className="animate-spin mr-2">⏳</span>
            Sending...
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Sent!
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Send Quote Requests
          </>
        )}
      </Button>
      {message && (
        <p className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {status === 'error' && <AlertCircle className="inline mr-1 h-4 w-4" />}
          {message}
        </p>
      )}
    </div>
  );
}
