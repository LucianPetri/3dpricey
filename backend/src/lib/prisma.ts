import { PrismaClient } from '@prisma/client';

declare global {
  var __3dpriceyPrisma: PrismaClient | undefined;
}

export const prisma = global.__3dpriceyPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  global.__3dpriceyPrisma = prisma;
}
