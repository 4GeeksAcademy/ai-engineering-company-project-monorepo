// Deprecated screen. It is not imported by uis/website or uis/backoffice.
// Ask Brasaland standards via POST /knowledge/query on uvicorn api.app:app
// (services/knowledge/routes.py). See docs/knowledge-rag.md.
import React, { useState } from 'react';

const SUPPORT =
  'If this continues, contact Brasaland Digital at Medellín headquarters.';

export default function KnowledgeBaseQueryUI() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!question.trim()) return;

    setStatus('loading');
    setError(null);
    setAnswer('');
    let outcome: 'success' | 'error' = 'error';

    try {
      const response = await fetch('/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error('unavailable');
      }

      let data;
      try {
        data = await response.json();
      } catch {
        throw new Error('unavailable');
      }
      const nextAnswer = data?.answer;
      if (typeof nextAnswer !== 'string' || !nextAnswer.trim()) {
        setAnswer('The assistant had no written answer for that question.');
      } else {
        setAnswer(nextAnswer);
      }
      outcome = 'success';
    } catch {
      setError(
        'The knowledge assistant is unavailable right now. Try again in a moment.',
      );
    } finally {
      setStatus(outcome);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <style>{`
        @keyframes kb-spin { to { transform: rotate(360deg); } }
        .kb-spinner { width: 1rem; height: 1rem; border-radius: 50%; border: 2px solid #cfe; border-top-color: #0066cc; animation: kb-spin 0.7s linear infinite; display: inline-block; }
      `}</style>
      <h2>Knowledge Base Sales Assistant</h2>
      <p style={{ color: '#666' }}>Ask questions about company policies, catalogs, and procedures.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What is our return policy for enterprise tier clients?"
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
          disabled={status === 'loading'}
        />
        <button
          type="submit"
          disabled={status === 'loading' || !question.trim()}
          style={{
            padding: '12px 20px',
            backgroundColor: status === 'loading' ? '#888' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: status === 'loading' ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {status === 'loading' ? 'Searching & Generating Answer...' : 'Ask Assistant'}
        </button>
      </form>

      {status === 'loading' && (
        <div role="status" style={{ marginTop: '20px', display: 'flex', gap: '10px', alignItems: 'center', color: '#555' }}>
          <span className="kb-spinner" aria-hidden="true" />
          Searching the knowledge base…
        </div>
      )}

      {status === 'error' && error && (
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px' }} role="alert">
          <p>{error}</p>
          <p>
            <button type="button" onClick={() => void handleSubmit()} style={{ marginTop: '10px', padding: '8px 12px' }}>
              Try again
            </button>
          </p>
          <p><a href="/">Back to homepage</a></p>
          <p style={{ color: '#7f1d1d', fontSize: '0.9rem' }}>{SUPPORT}</p>
        </div>
      )}

      {status === 'success' && answer && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', color: '#1f2937', borderRadius: '6px', borderLeft: '4px solid #0066cc' }}>
          <h3 style={{ marginTop: 0 }}>Answer:</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{answer}</p>
        </div>
      )}
    </div>
  );
}
