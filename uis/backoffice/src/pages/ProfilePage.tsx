import { useState, useEffect, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth'

export default function ProfilePage() {
  const { user, profile, updateProfile, logout } = useAuth()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (profile) {
      setName(profile.name ?? '')
      setPhone(profile.phone ?? '')
      setAddress(profile.address ?? '')
    }
  }, [profile])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)

    try {
      await updateProfile({
        name: name.trim() || undefined,
        phone: phone.trim() || undefined,
        address: address.trim() || undefined,
      })
      setMessage('Profile updated successfully.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <section className="header">
        <div>
          <p className="eyebrow">TrackFlow Operations</p>
          <h1>My Profile</h1>
          <p className="subtitle">
            {user?.email && `Signed in as ${user.email}`}
          </p>
        </div>

        <div className="header-actions">
          <Link to="/account/change-password" className="nav-link">
            Change password
          </Link>
          <button type="button" className="secondary-button" onClick={logout}>
            Sign out
          </button>
        </div>
      </section>

      {message && <div className="action-message success-message">{message}</div>}
      {error && <div className="action-message error-message">{error}</div>}

      <form className="create-card" onSubmit={handleSubmit}>
        <div className="form-heading">
          <h2>Personal information</h2>
        </div>

        <div className="form-grid">
          <label>
            Email
            <input readOnly value={user?.email ?? ''} />
          </label>

          <label>
            Role
            <input readOnly value={user?.role ?? ''} />
          </label>

          <label>
            Name
            <input
              type="text"
              placeholder="Your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label>
            Phone
            <input
              type="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </label>

          <label className="notes-field">
            Address
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </label>
        </div>

        <button className="primary-button" disabled={busy} type="submit">
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </main>
  )
}