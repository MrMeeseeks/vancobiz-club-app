import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { listCategories, listMembers, sendReferral } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { AsyncView, categoryName, ErrorNote, useMemberName } from '../../components/ui'

export function SendReferral() {
  const { t, pick } = useI18n()
  const { member } = useAuth()
  const nameOf = useMemberName()
  const [params] = useSearchParams()
  const state = useAsync(async () => {
    const [categories, members] = await Promise.all([listCategories(), listMembers()])
    return { categories, members: members.filter((m) => m.status === 'active' && m.id !== member?.id) }
  }, [member?.id])

  const [receiverId, setReceiverId] = useState(params.get('to') ?? '')
  const [firstName, setFirstName] = useState('')
  const [contact, setContact] = useState('')
  const [need, setNeed] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (!member) return null

  function reset() {
    setReceiverId('')
    setFirstName('')
    setContact('')
    setNeed('')
    setNotes('')
    setConsent(false)
    setSentTo(null)
  }

  return (
    <div className="stack">
      <section>
        <h1>{t('send.title')}</h1>
        <p className="muted">{t('send.intro')}</p>
      </section>
      <AsyncView state={state}>
        {({ categories, members }) => {
          async function onSubmit(e: FormEvent) {
            e.preventDefault()
            if (!member || !consent) return
            setBusy(true)
            setError(null)
            try {
              await sendReferral({
                sender_id: member.id,
                receiver_id: receiverId,
                client_first_name: firstName.trim(),
                client_contact: contact.trim(),
                need: need.trim(),
                notes: notes.trim(),
                consent_confirmed: consent,
              })
              setSentTo(nameOf(members.find((m) => m.id === receiverId)))
            } catch (err) {
              setError(errorMessage(err))
            } finally {
              setBusy(false)
            }
          }

          if (sentTo) {
            return (
              <div className="stack">
                <p className="alert alert-success">{t('send.success', { name: sentTo })}</p>
                <div className="row">
                  <button type="button" className="btn" onClick={reset}>
                    {t('send.another')}
                  </button>
                  <Link to="/app/referrals" className="btn btn-outline">
                    {t('dashboard.openInbox')}
                  </Link>
                </div>
              </div>
            )
          }

          return (
            <form className="form" onSubmit={onSubmit}>
              <div className="field">
                <label htmlFor="s-to">{t('send.receiver')}</label>
                <select id="s-to" required value={receiverId} onChange={(e) => setReceiverId(e.target.value)}>
                  <option value="">{t('send.chooseReceiver')}</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {nameOf(m)} · {categoryName(categories, m.category_id, pick) || pick(m, 'business_name')}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="s-name">{t('send.clientFirstName')}</label>
                <input id="s-name" type="text" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="s-contact">{t('send.clientContact')}</label>
                <input id="s-contact" type="text" required minLength={3} maxLength={120} dir="ltr" value={contact} onChange={(e) => setContact(e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor="s-need">{t('send.need')}</label>
                <textarea id="s-need" required maxLength={280} value={need} onChange={(e) => setNeed(e.target.value)} aria-describedby="s-need-hint" />
                <span id="s-need-hint" className="hint">
                  {t('send.needHint')}
                </span>
              </div>
              <div className="field">
                <label htmlFor="s-notes">
                  {t('send.notes')} <span className="muted">({t('common.optional')})</span>
                </label>
                <textarea id="s-notes" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} aria-describedby="s-notes-hint" />
                <span id="s-notes-hint" className="hint">
                  {t('send.notesHint')}
                </span>
              </div>
              <p className="hint">{t('send.privacyHint')}</p>
              <label className="check">
                <input type="checkbox" required checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>{t('send.consent')}</span>
              </label>
              <ErrorNote message={error} />
              <button className="btn" type="submit" disabled={busy || !consent}>
                {busy ? t('send.sending') : t('send.submit')}
              </button>
            </form>
          )
        }}
      </AsyncView>
    </div>
  )
}
