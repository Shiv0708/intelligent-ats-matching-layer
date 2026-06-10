-- Run this in Neon SQL Editor if `npm run db:push` fails with EPERM on Windows.
-- https://console.neon.tech → your project → SQL Editor → paste and Run

CREATE TABLE IF NOT EXISTS "Education" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "institution" TEXT NOT NULL,
    "degree" TEXT,
    "field" TEXT,
    "duration" TEXT,
    "grade" TEXT,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Education_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Internship" (
    "id" TEXT NOT NULL,
    "candidateId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "company" TEXT NOT NULL,
    "role" TEXT,
    "duration" TEXT,
    "location" TEXT,
    "responsibilities" TEXT,
    "technologies" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Internship_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Education_candidateId_idx" ON "Education"("candidateId");
CREATE INDEX IF NOT EXISTS "Internship_candidateId_idx" ON "Internship"("candidateId");

DO $$ BEGIN
    ALTER TABLE "Education" ADD CONSTRAINT "Education_candidateId_fkey"
        FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    ALTER TABLE "Internship" ADD CONSTRAINT "Internship_candidateId_fkey"
        FOREIGN KEY ("candidateId") REFERENCES "Candidate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
