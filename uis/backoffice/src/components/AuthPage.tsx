import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ArrowLeft, KeyRound, LogIn, Mail } from 'lucide-react'
import { authRequest, getSessionToken, saveSession } from '../utils/auth'

type AuthPath = '/login' | '/forgot-password' | '/reset-password' | '/account/change-password'

const titles: Record<AuthPath, string> = {
  '/login': 'Iniciar sesión',
  '/forgot-password': 'Recuperar contraseña',
  '/reset-password': 'Restablecer contraseña',
  '/account/change-password': 'Cambiar contraseña',
}

const inputClass = 'mt-2 block min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:bg-slate-100'
const linkClass = 'inline-flex items-center gap-2 rounded-sm text-sm font-semibold text-emerald-800 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800'

export function AuthPage({ path }: { path: AuthPath }) {
  const isLogin = path === '/login'
  const isForgot = path === '/forgot-password'
  const isReset = path === '/reset-password'
  const isChange = path === '/account/change-password'
  const token = new URLSearchParams(window.location.search).get('token') ?? ''
  const [pending, setPending] = useState(false)
  const [complete, setComplete] = useState(false)
  const [checking, setChecking] = useState(isChange)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState(() => {
    const params = new URLSearchParams(window.location.search)
    if (isLogin && params.get('password_reset') === 'success') return 'Contraseña restablecida. Ya puedes iniciar sesión con tu nueva contraseña.'
    if (isLogin && params.get('session') === 'expired') return 'Tu sesión ha caducado. Inicia sesión de nuevo.'
    return ''
  })
  const submitting = useRef(false)

  useEffect(() => {
    if (!isChange) return
    const session = getSessionToken()
    if (!session) {
      window.location.replace('/login?session=expired')
      return
    }
    const controller = new AbortController()
    authRequest('/me', { headers: { Authorization: `Bearer ${session}` }, signal: controller.signal })
      .then(() => { if (!controller.signal.aborted) setChecking(false) })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No se pudo verificar la sesión. Recarga la página.')
      })
    return () => controller.abort()
  }, [isChange])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || complete || checking) return
    const data = new FormData(event.currentTarget)
    const newPassword = String(data.get('new_password') ?? '')
    setError('')
    setNotice('')
    if (!isLogin && !isForgot) {
      if (newPassword !== data.get('confirm_password')) {
        setError('La nueva contraseña y su confirmación no coinciden.')
        return
      }
      if (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72) {
        setError('La nueva contraseña debe tener al menos 8 caracteres y no superar 72 bytes UTF-8.')
        return
      }
    }
    submitting.current = true
    setPending(true)
    try {
      if (isLogin) {
        const result = await authRequest<{ access_token: string }>('/login', {
          method: 'POST', body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
        })
        saveSession(result.access_token)
        window.location.assign('/')
      } else if (isForgot) {
        await authRequest('/forgot-password', { method: 'POST', body: JSON.stringify({ email: data.get('email') }) })
        setNotice('Si esa dirección está registrada, recibirás un enlace en breve.')
        setComplete(true)
      } else if (isReset) {
        await authRequest('/reset-password', { method: 'POST', body: JSON.stringify({ token, new_password: newPassword }) })
        window.location.replace('/login?password_reset=success')
      } else {
        await authRequest('/change-password', {
          method: 'POST',
          headers: { Authorization: `Bearer ${getSessionToken() ?? ''}` },
          body: JSON.stringify({ current_password: data.get('current_password'), new_password: newPassword }),
        })
        setNotice('Contraseña actualizada correctamente.')
        setComplete(true)
      }
    } catch (cause: unknown) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con el servidor. Inténtalo de nuevo.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  const missingToken = isReset && !token
  const Icon = isLogin ? LogIn : isForgot ? Mail : KeyRound

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-6 py-5">
        <a href="/" className="font-display text-xl font-bold focus-visible:outline-2 focus-visible:outline-emerald-800">TrackFlow Backoffice</a>
      </header>
      <main className="mx-auto w-full max-w-md px-6 py-12 sm:py-16">
        <h1 className="font-display text-2xl font-bold">{titles[path]}</h1>
        {checking && !error && <p role="status" className="mt-4 text-sm">Verificando sesión...</p>}
        {notice && <p role="status" className="mt-5 border-l-4 border-emerald-700 bg-emerald-50 p-4 text-sm text-emerald-950">{notice}</p>}
        {(error || missingToken) && <p id="auth-error" role="alert" className="mt-5 border-l-4 border-red-700 bg-red-50 p-4 text-sm text-red-900">{missingToken ? 'El enlace no contiene un token válido. Solicita un nuevo enlace de recuperación.' : error}</p>}
        <form onSubmit={submit} className="mt-6" aria-busy={pending} aria-describedby={error || missingToken ? 'auth-error' : undefined}>
          <fieldset disabled={pending || complete || checking || missingToken} className="min-w-0 space-y-5 disabled:opacity-70">
            <legend className="sr-only">{titles[path]}</legend>
            {(isLogin || isForgot) && <div>
              <label htmlFor="auth-email" className="text-sm font-semibold">Email</label>
              <input id="auth-email" name="email" type="email" autoComplete="email" required className={inputClass} />
            </div>}
            {isLogin && <div>
              <label htmlFor="auth-password" className="text-sm font-semibold">Contraseña</label>
              <input id="auth-password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
            </div>}
            {isChange && <div>
              <label htmlFor="current-password" className="text-sm font-semibold">Contraseña actual</label>
              <input id="current-password" name="current_password" type="password" autoComplete="current-password" required className={inputClass} />
            </div>}
            {(isChange || isReset) && <>
              <div>
                <label htmlFor="new-password" className="text-sm font-semibold">Nueva contraseña</label>
                <input id="new-password" name="new_password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
              </div>
              <div>
                <label htmlFor="confirm-password" className="text-sm font-semibold">Confirmar nueva contraseña</label>
                <input id="confirm-password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} maxLength={72} required className={inputClass} />
              </div>
            </>}
            <button type="submit" className="flex min-h-11 w-full items-center justify-center gap-2 rounded-md bg-emerald-800 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-800 disabled:cursor-not-allowed">
              <Icon size={18} aria-hidden="true" />{pending ? 'Enviando...' : isForgot ? 'Enviar enlace' : titles[path]}
            </button>
          </fieldset>
        </form>
        <nav aria-label="Acceso y recuperación" className="mt-6 flex flex-col items-start gap-4">
          {isLogin && <a href="/forgot-password" className={linkClass}>¿Olvidaste tu contraseña?</a>}
          {isReset && (error || missingToken) && <a href="/forgot-password" className={linkClass}>Solicitar un nuevo enlace</a>}
          {!isLogin && <a href={isChange ? '/' : '/login'} className={linkClass}><ArrowLeft size={16} aria-hidden="true" />{isChange ? 'Volver al backoffice' : 'Volver a iniciar sesión'}</a>}
        </nav>
      </main>
    </div>
  )
}