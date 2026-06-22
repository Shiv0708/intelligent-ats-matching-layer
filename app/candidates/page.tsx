'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { BOOLEAN_SEARCH_HELP } from '@/lib/boolean-search';
import type { CandidateRecord } from '@/lib/types/resume';
import { highlightText } from '@/lib/highlight';

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<CandidateRecord[]>([]);
  const [query, setQuery] = useState('');
  const [skill, setSkill] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [booleanQuery, setBooleanQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (!advancedOpen && query) params.set('q', query);
    if (!advancedOpen && skill) params.set('skill', skill);
    if (advancedOpen && booleanQuery.trim()) params.set('boolean', booleanQuery.trim());
    const res = await fetch(`/api/candidates?${params}`);
    const data = await res.json();
    setCandidates(data.candidates ?? []);
    setLoading(false);
  }, [query, skill, advancedOpen, booleanQuery]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const runAdvancedSearch = () => {
    load();
  };

  return (
    <main className="container">
      <section className="header row-header">
        <div>
          <h1 className="title">Candidates</h1>
          <p className="subtitle">Search, filter, and manage parsed profiles.</p>
        </div>
        <a href="/api/candidates?export=csv" className="btn-secondary link-btn">
          Export all CSV
        </a>
      </section>

      <section className="panel">
        <div className="search-mode-row">
          <button
            type="button"
            className={`btn-secondary search-mode-btn ${!advancedOpen ? 'search-mode-btn--active' : ''}`}
            onClick={() => setAdvancedOpen(false)}
          >
            Simple search
          </button>
          <button
            type="button"
            className={`btn-secondary search-mode-btn ${advancedOpen ? 'search-mode-btn--active' : ''}`}
            onClick={() => setAdvancedOpen(true)}
          >
            Advanced (boolean)
          </button>
        </div>

        {!advancedOpen ? (
          <div className="filter-row">
            <input
              type="search"
              placeholder="Search by name, email, skill…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <input
              type="search"
              placeholder="Filter by technology/skill…"
              value={skill}
              onChange={(e) => setSkill(e.target.value)}
            />
          </div>
        ) : (
          <div className="advanced-search-panel">
            <label className="label" htmlFor="boolean-query">
              Boolean query
            </label>
            <textarea
              id="boolean-query"
              className="boolean-query-input"
              rows={3}
              placeholder='e.g. python AND (aws OR azure) NOT intern'
              value={booleanQuery}
              onChange={(e) => setBooleanQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  runAdvancedSearch();
                }
              }}
            />
            <p className="boolean-search-help muted">{BOOLEAN_SEARCH_HELP}</p>
            <div className="action-row">
              <button type="button" onClick={runAdvancedSearch}>
                Search
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setBooleanQuery('')}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : candidates.length === 0 ? (
          <p className="muted">No candidates found.</p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Experience</th>
                  <th>Skills</th>
                  <th>Credibility</th>
                  <th>Projects</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.candidateName}</strong>
                      <br />
                      <span className="muted">{c.email || '—'}</span>
                    </td>
                    <td>{c.totalExperience || '—'}</td>
                    <td>
                      <div className="tag-row compact">
                        {c.skills.slice(0, 4).map((s) => (
                          <span className="tag" key={s}>{highlightText(s)}</span>
                        ))}
                        {c.skills.length > 4 && <span className="muted">+{c.skills.length - 4}</span>}
                      </div>
                    </td>
                    <td>{c.credibilityScore ?? '—'}</td>
                    <td>{c.projects.length}</td>
                    <td>
                      <Link href={`/candidates/${c.id}`} className="text-link">View</Link>
                    </td>
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
