import { PrismaClient } from '@prisma/client';

// Singleton pattern for Prisma Client to avoid exhausting database connections
// This is especially important for serverless/pooled database connections like Supabase

declare global {
  var __prisma: PrismaClient | undefined;
}

// Use a single instance of PrismaClient
// Connection pool: Prisma default is connection_limit=10 for PostgreSQL, which is
// appropriate for this app (~25 concurrent users). No custom pool config needed.
const prisma =
  global.__prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// In development, store the client on global to prevent multiple instances during hot-reload
if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

// Graceful shutdown handling
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

export default prisma;
