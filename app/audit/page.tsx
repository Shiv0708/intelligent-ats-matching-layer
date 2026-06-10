'use client';

import { useEffect, useState } from 'react';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  user: { email: string; name: string } | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);

  useEffect(() => {
    fetch('/api/audit')
      .then((r) => r.json())
      .then((d) => setLogs(d.logs ?? []));
  }, []);

  return (
    <main className="container">
      <section className="header">
        <h1 className="title">Audit Trail</h1>
        <p className="subtitle">History of parse, update, delete, match, and review actions.</p>
      </section>

      <section className="panel">
        {logs.length === 0 ? (
          <p className="muted">No audit entries yet.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="muted">{new Date(log.createdAt).toLocaleString()}</td>
                    <td>{log.user?.name ?? log.user?.email ?? '—'}</td>
                    <td><code>{log.action}</code></td>
                    <td>{log.entityType}{log.entityId ? ` / ${log.entityId.slice(0, 8)}…` : ''}</td>
                    <td><pre className="inline-pre">{JSON.stringify(log.details)}</pre></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
