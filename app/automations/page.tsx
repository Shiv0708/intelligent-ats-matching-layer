'use client';

import { useCallback, useEffect, useState } from 'react';
import { PIPELINE_STAGES } from '@/lib/pipeline-stages';

interface WorkflowRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  triggerStage: string | null;
  delayHours: number | null;
  template: { id: string; key: string; name: string; subject: string };
}

interface EmailTemplate {
  id: string;
  key: string;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
}

interface MessageLog {
  id: string;
  toEmail: string;
  subject: string;
  status: string;
  error: string | null;
  createdAt: string;
  candidate: { candidateName: string };
  template: { name: string; key: string } | null;
  rule: { name: string } | null;
}

function stageLabel(stage: string | null) {
  if (!stage) return '—';
  return PIPELINE_STAGES.find((s) => s.id === stage)?.label ?? stage;
}

function triggerLabel(rule: WorkflowRule) {
  if (rule.triggerType === 'stage_enter') {
    return `When candidate enters “${stageLabel(rule.triggerStage)}”`;
  }
  if (rule.triggerType === 'stage_idle') {
    return `${rule.delayHours ?? 0}h in “${stageLabel(rule.triggerStage)}” with no move`;
  }
  return rule.triggerType;
}

export default function AutomationsPage() {
  const [rules, setRules] = useState<WorkflowRule[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [rulesRes, templatesRes, messagesRes] = await Promise.all([
      fetch('/api/automations/rules'),
      fetch('/api/automations/templates'),
      fetch('/api/automations/messages'),
    ]);
    const rulesData = await rulesRes.json();
    const templatesData = await templatesRes.json();
    const messagesData = await messagesRes.json();
    setRules(rulesData.rules ?? []);
    setTemplates(templatesData.templates ?? []);
    setMessages(messagesData.messages ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRule = async (id: string, enabled: boolean) => {
    await fetch('/api/automations/rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, enabled }),
    });
    load();
  };

  const saveTemplate = async () => {
    if (!editingTemplate) return;
    const res = await fetch('/api/automations/templates', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: editingTemplate.id,
        subject: editingTemplate.subject,
        bodyHtml: editingTemplate.bodyHtml,
        bodyText: editingTemplate.bodyText,
      }),
    });
    if (res.ok) {
      setEditingTemplate(null);
      setNotice('Template saved.');
      load();
    }
  };

  const runDueTasks = async () => {
    setRunning(true);
    setNotice(null);
    const res = await fetch('/api/automations/run', { method: 'POST' });
    const data = await res.json();
    setRunning(false);
    if (res.ok) {
      setNotice(`Processed ${data.processed ?? 0} scheduled task(s).`);
      load();
    } else {
      setNotice(data.error || 'Run failed');
    }
  };

  return (
    <main className="container">
      <section className="header">
        <h1 className="title">Recruitment automations</h1>
        <p className="subtitle">
          Every pipeline move sends a status email via Resend (same as <code>sendemail.js</code>).
          Set <code>RESEND_API_KEY</code> and <code>EMAIL_FROM</code> in <code>.env</code>.
        </p>
      </section>

      <div className="action-row">
        <button type="button" onClick={runDueTasks} disabled={running}>
          {running ? 'Running…' : 'Run due follow-ups now'}
        </button>
        <button type="button" className="btn-secondary" onClick={load}>
          Refresh
        </button>
      </div>
      {notice && <p className="muted">{notice}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <section className="panel automations-section">
            <h2 className="section-title">Workflow rules</h2>
            <p className="muted">
              Toggle rules on or off. Stage-enter emails send immediately; idle rules schedule follow-ups.
            </p>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>On</th>
                    <th>Rule</th>
                    <th>Trigger</th>
                    <th>Template</th>
                  </tr>
                </thead>
                <tbody>
                  {rules.map((rule) => (
                    <tr key={rule.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={rule.enabled}
                          onChange={(e) => toggleRule(rule.id, e.target.checked)}
                          aria-label={`Enable ${rule.name}`}
                        />
                      </td>
                      <td><strong>{rule.name}</strong></td>
                      <td className="muted">{triggerLabel(rule)}</td>
                      <td>{rule.template.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel automations-section">
            <h2 className="section-title">Email templates</h2>
            <p className="muted">
              Variables: <code>{'{{candidateName}}'}</code>, <code>{'{{jobTitle}}'}</code>,{' '}
              <code>{'{{stageLabel}}'}</code>, <code>{'{{companyName}}'}</code>,{' '}
              <code>{'{{schedulingLink}}'}</code>
            </p>
            <ul className="template-list">
              {templates.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className="btn-secondary template-list-btn"
                    onClick={() => setEditingTemplate({ ...t })}
                  >
                    {t.name}
                  </button>
                  <span className="muted"> — {t.subject}</span>
                </li>
              ))}
            </ul>

            {editingTemplate && (
              <div className="template-editor">
                <h3>Edit: {editingTemplate.name}</h3>
                <div className="field-group">
                  <label>Subject</label>
                  <input
                    value={editingTemplate.subject}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, subject: e.target.value })
                    }
                  />
                </div>
                <div className="field-group">
                  <label>HTML body</label>
                  <textarea
                    rows={8}
                    value={editingTemplate.bodyHtml}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, bodyHtml: e.target.value })
                    }
                  />
                </div>
                <div className="action-row">
                  <button type="button" onClick={saveTemplate}>Save template</button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setEditingTemplate(null)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="panel automations-section">
            <h2 className="section-title">Message log</h2>
            {messages.length === 0 ? (
              <p className="muted">No messages yet. Move a candidate on the pipeline or parse a resume with an email.</p>
            ) : (
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>When</th>
                      <th>Candidate</th>
                      <th>To</th>
                      <th>Subject</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {messages.map((m) => (
                      <tr key={m.id}>
                        <td className="muted">{new Date(m.createdAt).toLocaleString()}</td>
                        <td>{m.candidate.candidateName}</td>
                        <td>{m.toEmail || '—'}</td>
                        <td>{m.subject}</td>
                        <td>
                          <span className={`msg-status msg-status--${m.status}`}>{m.status}</span>
                          {m.error && <div className="muted">{m.error}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
