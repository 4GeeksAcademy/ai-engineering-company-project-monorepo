import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { resetPassword } from '../auth'

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token') ?? ''

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tokenExpired, setTokenExpired] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setBusy(true)
    setError(null)

    try {
      await resetPassword(token, newPassword)
      setDone(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Reset failed'
      setError(message)
      // Backend returns 400 for invalid/expired/reused tokens
      if (message.toLowerCase().includes('invalid') || message.toLowerCase().includes('expired')) {
        setTokenExpired(true)
      }
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="eyebrow">TrackFlow Operations</p>
            <h1>Password updated</h1>
            <p className="subtitle">
              Your password has been reset successfully. You can now sign in with your new password.
            </p>
          </div>
          <p className="auth-alt">
            <Link to="/login">Sign in</Link>.
          </p>
        </div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="eyebrow">TrackFlow Operations</p>
            <h1>Invalid link</h1>
            <p className="subtitle">
              This password reset link is invalid or missing a token. Please request a new one.
            </p>
          </div>
          <p className="auth-alt">
            <Link to="/forgot-password">Request a new reset link</Link>.
          </p>
        </div>
      </main>
    )
  }

  if (tokenExpired) {
    return (
      <main className="auth-page">
        <div className="auth-card">
          <div className="auth-header">
            <p className="eyebrow">TrackFlow Operations</p>
            <h1>Link expired or invalid</h1>
            <p className="subtitle">
              This password reset link is no longer valid. It may have expired or already been used.
            </p>
          </div>
          <p className="auth-alt">
            <Link to="/forgot-password">Request a new reset link</Link>.
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
          <h1>Choose a new password</h1>
          <p className="subtitle">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <label>
            New password
            <input
              required
              type="password"
              placeholder="At least 8 characters"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </label>

          <label>
            Confirm password
            <input
              required
              type="password"
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>

          {error && <div className="auth-error">{error}</div>}

          <button className="primary-button auth-button" disabled={busy} type="submit">
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </form>

        <p className="auth-alt">
          <Link to="/login">Back to sign in</Link>.
        </p>
      </div>
    </main>
  )
}