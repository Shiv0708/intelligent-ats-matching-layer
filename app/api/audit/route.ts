import { NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/audit-log';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const logs = await listAuditLogs(100);
    return NextResponse.json({
      logs: logs.map((l) => ({
        id: l.id,
        action: l.action,
        entityType: l.entityType,
        entityId: l.entityId,
        details: l.details ? JSON.parse(l.details) : null,
        user: l.user ? { email: l.user.email, name: l.user.name } : null,
        createdAt: l.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load audit logs';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
