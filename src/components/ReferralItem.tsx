import { useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { setReferralStatus } from '../lib/api'
import { formatDate, formatMoney } from '../lib/format'
import type { ReferralStatus, ReferralWithMembers } from '../lib/types'
import { errorMessage } from '../lib/useAsync'
import { ErrorNote, StatusBadge, useMemberName } from './ui'

/**
 * One referral. `canAct` shows the receiver's buttons (Accept/Decline, then Contacted/Won/Lost).
 * `extra` is a slot for admin buttons.
 */
export function ReferralItem({ referral: r, canAct, onChanged, extra }: { referral: ReferralWithMembers; canAct: boolean; onChanged: () => void; extra?: ReactNode }) {
  const { t, lang } = useI18n()
  const nameOf = useMemberName()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askValue, setAskValue] = useState(false)
  const [value, setValue] = useState('')

  async function move(status: ReferralStatus, deal: number | null = null) {
    setBusy(true)
    setError(null)
    try {
      await setReferralStatus(r.id, status, deal)
      setAskValue(false)
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const redacted = Boolean(r.client_redacted_at)
  return (
    <div className="item">
      <div className="row">
        <StatusBadge status={r.status} />
        <span className="small muted">{formatDate(lang, r.created_at)}</span>
        <span className="spacer" />
        {r.status === 'won' && r.deal_value_cad !== null && <strong>{formatMoney(lang, r.deal_value_cad)}</strong>}
      </div>
      <dl>
        <dt>{t('inbox.from')}</dt>
        <dd>{nameOf(r.sender)}</dd>
        <dt>{t('inbox.to')}</dt>
        <dd>{nameOf(r.receiver)}</dd>
        {redacted ? (
          <>
            <dt>{t('inbox.client')}</dt>
            <dd className="muted">{t('inbox.redacted')}</dd>
          </>
        ) : (
          <>
            <dt>{t('inbox.client')}</dt>
            <dd>{r.client_first_name}</dd>
            <dt>{t('inbox.contact')}</dt>
            <dd>
              <span className="ltr">{r.client_contact}</span>
            </dd>
            <dt>{t('inbox.need')}</dt>
            <dd>{r.need}</dd>
            {r.notes && (
              <>
                <dt>{t('inbox.notes')}</dt>
                <dd>{r.notes}</dd>
              </>
            )}
          </>
        )}
      </dl>
      <ErrorNote message={error} />
      {canAct && r.status === 'pending' && (
        <div className="row">
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => move('accepted')}>
            {t('inbox.accept')}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move('declined')}>
            {t('inbox.decline')}
          </button>
        </div>
      )}
      {canAct && (r.status === 'accepted' || r.status === 'contacted') && !askValue && (
        <div className="row">
          {r.status === 'accepted' && (
            <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move('contacted')}>
              {t('inbox.markContacted')}
            </button>
          )}
          <button type="button" className="btn btn-sm" disabled={busy} onClick={() => setAskValue(true)}>
            {t('inbox.markWon')}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => move('lost')}>
            {t('inbox.markLost')}
          </button>
        </div>
      )}
      {canAct && askValue && (
        <form
          className="row"
          onSubmit={(e) => {
            e.preventDefault()
            move('won', value.trim() === '' ? null : Number(value))
          }}
        >
          <div className="field" style={{ flex: '1 1 200px' }}>
            <label htmlFor={`v-${r.id}`}>{t('inbox.dealValue')}</label>
            <input id={`v-${r.id}`} type="number" min="0" step="1" inputMode="numeric" dir="ltr" value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-sm" disabled={busy}>
            {t('inbox.confirmWon')}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAskValue(false)}>
            {t('common.cancel')}
          </button>
        </form>
      )}
      {extra}
    </div>
  )
}
