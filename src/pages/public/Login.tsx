import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { useAuth } from '../../lib/auth'
import { supabase } from '../../lib/supabase'
import { ErrorNote, Loading } from '../../components/ui'

export function Login() {
  const { t } = useI18n()
  const { session, member, isAdmin, loading, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <Loading />
  if (session && member) return <Navigate to="/app" replace />
  if (session && isAdmin) return <Navigate to="/admin" replace />
  if (session) {
    // Logged in, but this email isn't on the members list.
    return (
      <div className="stack" style={{ maxInlineSize: 560 }}>
        <h1>{t('login.notMemberTitle')}</h1>
        <p>{t('login.notMemberBody', { email: session.user.email ?? '' })}</p>
        <button type="button" className="btn btn-outline" onClick={signOut}>
          {t('nav.logout')}
        </button>
      </div>
    )
  }

  async function sendLink(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      // Back to the site root; the app then routes to the dashboard.
      options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
    })
    setBusy(false)
    if (err) setError(err.message)
    else setSent(true)
  }

  async function verify(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error: err } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (err) setError(t('login.invalid'))
  }

  return (
    <div className="stack" style={{ maxInlineSize: 560 }}>
      <h1>{t('login.title')}</h1>
      {!sent ? (
        <form className="form" onSubmit={sendLink}>
          <p className="muted">{t('login.intro')}</p>
          <div className="field">
            <label htmlFor="l-email">{t('login.email')}</label>
            <input id="l-email" type="email" required autoComplete="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <ErrorNote message={error} />
          <button className="btn" type="submit" disabled={busy}>
            {busy ? t('login.sending') : t('login.send')}
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={verify}>
          <p className="alert alert-gold">{t('login.sent')}</p>
          <div className="field">
            <label htmlFor="l-code">{t('login.code')}</label>
            <input
              id="l-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              maxLength={8}
              required
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
          </div>
          {error && (
            <p className="alert alert-error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button className="btn" type="submit" disabled={busy}>
              {t('login.verify')}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setSent(false)
                setCode('')
                setError(null)
              }}
            >
              {t('login.useAnother')}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
