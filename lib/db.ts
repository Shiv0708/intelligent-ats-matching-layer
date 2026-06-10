import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
  prismaSchemaHash: string | undefined;
};

/** Bump when prisma/schema.prisma changes so dev hot-reload picks up a fresh client. */
const PRISMA_SCHEMA_HASH = 'work-experience-v2-neon';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 400;

function isTransientDbError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("can't reach database server") ||
    msg.includes('connection reset') ||
    msg.includes('forcibly closed') ||
    msg.includes('p1001') ||
    msg.includes('p1017') ||
    msg.includes('connection timed out') ||
    msg.includes('econnreset') ||
    msg.includes('server has closed the connection')
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createPrismaClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

  return client.$extends({
    query: {
      async $allOperations({ args, query }) {
        let lastError: unknown;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          try {
            return await query(args);
          } catch (error) {
            lastError = error;
            if (!isTransientDbError(error) || attempt === MAX_RETRIES - 1) {
              throw error;
            }
            await sleep(RETRY_DELAY_MS * (attempt + 1));
            try {
              await client.$disconnect();
              await client.$connect();
            } catch {
              /* reconnect failed; next query attempt may still succeed */
            }
          }
        }
        throw lastError;
      },
    },
  });
}

if (
  globalForPrisma.prisma &&
  globalForPrisma.prismaSchemaHash !== PRISMA_SCHEMA_HASH
) {
  void globalForPrisma.prisma.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma =
  globalForPrisma.prismaSchemaHash === PRISMA_SCHEMA_HASH && globalForPrisma.prisma
    ? globalForPrisma.prisma
    : createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaHash = PRISMA_SCHEMA_HASH;
}
