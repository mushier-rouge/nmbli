import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nmbli — Out-the-door car deals without the haggle',
  description:
    'Nmbli turns your car brief into verified out-the-door quotes, keeps negotiations clean, and blocks contract surprises before you e-sign. Join the pilot waitlist.',
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
