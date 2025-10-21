import { NextResponse } from 'next/server';

export const config = {
  runtime: 'nodejs',
};

export function middleware() {
  return NextResponse.next();
}
