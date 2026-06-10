import { prisma } from '@/lib/db';
import { getCurrentUserId } from '@/lib/session';

export async function logAudit(
  action: string,
  entityType: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  const userId = await getCurrentUserId();

  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId: entityId ?? null,
      details: details ? JSON.stringify(details) : null,
      userId: userId ?? null,
    },
  });
}

export async function listAuditLogs(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      user: { select: { email: true, name: true } },
    },
  });
}
