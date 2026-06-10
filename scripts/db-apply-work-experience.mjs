import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const statements = [
  `CREATE TABLE IF NOT EXISTS "WorkExperience" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "duration" TEXT,
    "location" TEXT,
    "department" TEXT,
    "scopeOfWork" TEXT,
    "responsibilities" TEXT,
    "technologies" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkExperience_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "WorkExperience_candidateId_idx" ON "WorkExperience"("candidateId")`,
  `DO $$ BEGIN
    ALTER TABLE "WorkExperience" ADD CONSTRAINT "WorkExperience_candidateId_fkey"
      FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END $$`,
];

const prisma = new PrismaClient();

try {
  for (const sql of statements) {
    await prisma.$executeRawUnsafe(sql);
  }
  console.log('Applied WorkExperience table.');
} catch (e) {
  console.error('Migration failed:', e.message);
  process.exit(1);
} finally {
  await prisma.$disconnect();
}
