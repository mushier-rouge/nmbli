import { Prisma } from '@/generated/prisma';

export function toDecimal(value: number | string | Prisma.Decimal) {
  if (typeof value === 'string' || typeof value === 'number') {
    return new Prisma.Decimal(value);
  }

  return value;
}

export function toNullableDecimal(value: number | string | Prisma.Decimal | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return toDecimal(value);
}
