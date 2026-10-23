import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // query logging in development only — keep production logs clean
    log: process.env.NODE_ENV === "production" ? [] : ["query"],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db