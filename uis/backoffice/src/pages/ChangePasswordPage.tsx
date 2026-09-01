import { useState, type FormEvent } from 'react'
import { useAuth, changePassword } from '../auth'

export default function ChangePasswordPage() {
  const { token } = useAuth()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match.')
      return
    }

    setBusy(true)

    try {
      await changePassword(token!, currentPassword, newPassword)
      setMessage('Password changed successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      const detail = err instanceof Error ? err.message : 'Could not change password.'
      // Backend returns 400 for wrong current password — show error, keep session
      setError(detail)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>Change Password</h1>
          <p className="subtitle">
            Update your account password.
          </p>
        </div>
      </section>

      {message && <div className="action-message success-message">{message}</div>}
      {error && <div className="action-message error-message">{error}</div>}

      <form className="create-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Password</h2>
        </div>

        <div className="form-grid">
          <label>
            Current password
            <input
              required
              type="password"
              placeholder="Enter your current password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </label>

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
            Confirm new password
            <input
              required
              type="password"
              placeholder="Repeat your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </label>
        </div>

        <button className="primary-button" disabled={busy} type="submit">
          {busy ? 'Changing password…' : 'Change password'}
        </button>
      </form>
    </main>
  )
}