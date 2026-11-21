import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n'
import { submitJoinRequest, type JoinInput } from '../../lib/api'
import { errorMessage } from '../../lib/useAsync'
import { ErrorNote } from '../../components/ui'

const empty: JoinInput = { business_name: '', contact_name: '', category_text: '', email: '', phone: '', reason: '' }

export function Join() {
  const { t } = useI18n()
  const [form, setForm] = useState(empty)
  const [trap, setTrap] = useState('') // honeypot: real people never fill this
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (k: keyof JoinInput) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (trap) return setDone(true)
    setBusy(true)
    setError(null)
    try {
      await submitJoinRequest(form)
      setDone(true)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  if (done) return <p className="alert alert-success">{t('join.success')}</p>

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('join.title')}</h1>
        <p>{t('join.intro')}</p>
      </section>
      <form className="form" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="j-business">{t('join.business')}</label>
          <input id="j-business" type="text" required maxLength={160} value={form.business_name} onChange={set('business_name')} />
        </div>
        <div className="field">
          <label htmlFor="j-name">{t('join.contactName')}</label>
          <input id="j-name" type="text" required maxLength={120} autoComplete="name" value={form.contact_name} onChange={set('contact_name')} />
        </div>
        <div className="field">
          <label htmlFor="j-category">{t('join.category')}</label>
          <input id="j-category" type="text" required maxLength={160} value={form.category_text} onChange={set('category_text')} />
        </div>
        <div className="field">
          <label htmlFor="j-email">{t('join.email')}</label>
          <input id="j-email" type="email" required maxLength={200} autoComplete="email" dir="ltr" value={form.email} onChange={set('email')} />
        </div>
        <div className="field">
          <label htmlFor="j-phone">
            {t('join.phone')} <span className="muted">({t('common.optional')})</span>
          </label>
          <input id="j-phone" type="tel" maxLength={40} autoComplete="tel" dir="ltr" value={form.phone} onChange={set('phone')} />
        </div>
        <div className="field">
          <label htmlFor="j-reason">{t('join.reason')}</label>
          <textarea id="j-reason" required maxLength={1000} value={form.reason} onChange={set('reason')} />
        </div>
        <div className="honeypot" aria-hidden="true">
          <label htmlFor="j-website">Website</label>
          <input id="j-website" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
        </div>
        <ErrorNote message={error} />
        <button className="btn" type="submit" disabled={busy}>
          {busy ? t('join.sending') : t('join.submit')}
        </button>
      </form>
    </div>
  )
}
