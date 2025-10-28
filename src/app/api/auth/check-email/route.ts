import { NextResponse } from 'next/server';
import { z } from 'zod';

import { prisma } from '@/lib/prisma';

const requestSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = requestSchema.parse(body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
      select: { id: true },
    });

    if (existingUser) {
      // User exists - they can sign in without invite code
      return NextResponse.json({
        exists: true,
        needsInvite: false,
      });
    }

    // New user - check if they have an unused invite code waiting
    // For now, all new users need an invite code
    return NextResponse.json({
      exists: false,
      needsInvite: true,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid email' }, { status: 400 });
    }

    console.error('Error checking email:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
