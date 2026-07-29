import React, { useState } from 'react';

export default function KnowledgeBaseQueryUI() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setLoading(true);
    setError(null);
    setAnswer('');

    try {
      const response = await fetch('/knowledge/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: Failed to fetch answer.`);
      }

      const data = await response.json();
      setAnswer(data.answer);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '650px', margin: '40px auto', fontFamily: 'sans-serif', padding: '0 20px' }}>
      <h2>Knowledge Base Sales Assistant</h2>
      <p style={{ color: '#666' }}>Ask questions about company policies, catalogs, and procedures.</p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <textarea
          rows={4}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., What is our return policy for enterprise tier clients?"
          style={{ width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid #ccc' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !question.trim()}
          style={{
            padding: '12px 20px',
            backgroundColor: loading ? '#888' : '#0066cc',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {loading ? 'Searching & Generating Answer...' : 'Ask Assistant'}
        </button>
      </form>

      {error && (
        <div style={{ marginTop: '20px', padding: '12px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '6px' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {answer && (
        <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', color: '#1f2937', borderRadius: '6px', borderLeft: '4px solid #0066cc' }}>
          <h3 style={{ marginTop: 0 }}>Answer:</h3>
          <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{answer}</p>
        </div>
      )}
    </div>
  );
}