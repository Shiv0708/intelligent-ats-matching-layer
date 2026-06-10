import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { seedWorkflowDefaults } from '../lib/workflow-defaults';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.RECRUITER_EMAIL ?? 'recruiter@ats.local';
  const password = process.env.RECRUITER_PASSWORD ?? 'recruiter123';
  const name = process.env.RECRUITER_NAME ?? 'Recruiter';

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash, name },
    create: {
      email,
      passwordHash,
      name,
      role: 'recruiter',
    },
  });

  console.log(`Recruiter ready: ${email}`);

  await seedWorkflowDefaults(prisma);
  console.log('Workflow templates and rules seeded.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
