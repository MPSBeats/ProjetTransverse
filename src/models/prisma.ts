// src/models/prisma.ts — Client Prisma singleton

import { PrismaClient } from '@prisma/client';

// Singleton pour éviter les connexions multiples en développement (hot reload)
const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

export default prisma;
