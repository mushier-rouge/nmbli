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

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists - they shouldn't be on waitlist
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: 'This email is already registered. Please sign in instead.' },
        { status: 400 }
      );
    }

    // Check if already on waitlist
    const existingWaitlist = await prisma.waitlist.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingWaitlist) {
      return NextResponse.json({
        message: "You're already on the waitlist! We'll notify you when we have an invite code available.",
      });
    }

    // Add to waitlist
    await prisma.waitlist.create({
      data: { email: normalizedEmail },
    });

    return NextResponse.json({
      message: "You've been added to the waitlist! We'll email you when we have an invite code available.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid email address' }, { status: 400 });
    }

    console.error('Error adding to waitlist:', error);
    return NextResponse.json({ message: 'Could not add to waitlist. Please try again.' }, { status: 500 });
  }
}
