import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)

    try {
      await forgotPassword(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed')
    } finally {
      setBusy(false)
    }
  }

  if (sent) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="eyebrow">TrackFlow Operations</p>
            <h1>Check your inbox</h1>
            <p className="subtitle">
              Si esa dirección está registrada, recibirás un enlace en breve.
            </p>
          </div>
          <p className="auth-alt">
            <Link to="/login">Back to sign in</Link>.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Reset password</h1>
          <p className="subtitle">
            Enter your email and we'll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input
              required
              type="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="primary-button auth-button" disabled={busy} type="submit">
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/login">Back to sign in</Link>.
        </p>
      </div>
    </main>
  )
}