import { Prisma } from '@/generated/prisma';

export function toDecimal(value: number | string) {
  if (value instanceof Prisma.Decimal) {
    return value;
  }

  if (typeof value === 'string') {
    return new Prisma.Decimal(value);
  }

  return new Prisma.Decimal(value.toString());
}

export function toNullableDecimal(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }
  return toDecimal(value);
}
