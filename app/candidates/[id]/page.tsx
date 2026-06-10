'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import CandidateProfile, { type ProjectPeerMatchView } from '@/components/CandidateProfile';
import type { CandidateRecord } from '@/lib/types/resume';

export default function CandidateDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [candidate, setCandidate] = useState<CandidateRecord | null>(null);
  const [peerMatches, setPeerMatches] = useState<ProjectPeerMatchView[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ candidateName: '', email: '', phone: '', totalExperience: '', skills: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [res, peerRes] = await Promise.all([
      fetch(`/api/candidates/${params.id}`),
      fetch(`/api/candidates/${params.id}/peer-matches`),
    ]);
    const data = await res.json();
    const peerData = peerRes.ok ? await peerRes.json() : { peerMatches: [] };
    if (!res.ok) {
      setError(data.error || 'Not found');
      setCandidate(null);
      setPeerMatches([]);
    } else {
      setCandidate(data.candidate);
      setPeerMatches(peerData.peerMatches ?? []);
      setForm({
        candidateName: data.candidate.candidateName,
        email: data.candidate.email ?? '',
        phone: data.candidate.phone ?? '',
        totalExperience: data.candidate.totalExperience ?? '',
        skills: data.candidate.skills.join(', '),
      });
    }
    setLoading(false);
  }, [params.id]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    const res = await fetch(`/api/candidates/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidateName: form.candidateName,
        email: form.email || null,
        phone: form.phone || null,
        totalExperience: form.totalExperience || null,
        skills: form.skills.split(',').map((s) => s.trim()).filter(Boolean),
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }
    setCandidate(data.candidate);
    setEditing(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this candidate permanently?')) return;
    const res = await fetch(`/api/candidates/${params.id}`, { method: 'DELETE' });
    if (res.ok) router.push('/candidates');
    else {
      const data = await res.json();
      setError(data.error);
    }
  };

  const handleReview = async (projectId: string, status: 'approved' | 'rejected', note?: string) => {
    await fetch(`/api/projects/${projectId}/review`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    load();
  };

  if (loading) return <main className="container"><p className="muted">Loading…</p></main>;
  if (error || !candidate) return <main className="container"><p className="error-text">{error || 'Not found'}</p></main>;

  return (
    <main className="container">
      <section className="header row-header">
        <div>
          <h1 className="title">Candidate Profile</h1>
        </div>
        <div className="action-row">
          <button type="button" className="btn-secondary" onClick={() => setEditing(!editing)}>
            {editing ? 'Cancel edit' : 'Edit'}
          </button>
        </div>
      </section>

      <section className="panel">
        {editing ? (
          <div>
            <div className="field-group">
              <label>Name</label>
              <input value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} />
            </div>
            <div className="field-group">
              <label>Email</label>
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div className="field-group">
              <label>Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div className="field-group">
              <label>Experience</label>
              <input value={form.totalExperience} onChange={(e) => setForm({ ...form, totalExperience: e.target.value })} />
            </div>
            <div className="field-group">
              <label>Skills (comma-separated)</label>
              <input value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} />
            </div>
            <button type="button" onClick={handleSave}>Save changes</button>
          </div>
        ) : (
          <CandidateProfile
            candidate={candidate}
            peerMatches={peerMatches}
            showActions
            onDelete={handleDelete}
            onExport={() => { window.location.href = `/api/candidates/${params.id}?format=csv`; }}
            onReviewProject={handleReview}
          />
        )}
      </section>
    </main>
  );
}
