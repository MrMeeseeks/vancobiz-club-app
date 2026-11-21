import { useState } from 'react'
import { useI18n } from '../../i18n'
import { deleteReferral, listReferrals, redactReferral } from '../../lib/api'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { ReferralItem } from '../../components/ReferralItem'
import { AsyncView, ErrorNote } from '../../components/ui'

export function AllReferrals() {
  const { t } = useI18n()
  const state = useAsync(listReferrals)
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all')
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>, confirmText: string) {
    if (!window.confirm(confirmText)) return
    setError(null)
    try {
      await action()
      state.reload()
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <h1>{t('admin.referralsTitle')}</h1>
      <div className="chips">
        {(['all', 'open', 'closed'] as const).map((f) => (
          <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
            {f === 'all' ? t('common.all') : f === 'open' ? t('inbox.filterOpen') : t('inbox.filterClosed')}
          </button>
        ))}
      </div>
      <ErrorNote message={error} />
      <AsyncView state={state}>
        {(all) => {
          const isClosed = (s: string) => s === 'won' || s === 'lost' || s === 'declined'
          const shown = all.filter((r) => filter === 'all' || (filter === 'closed') === isClosed(r.status))
          if (shown.length === 0) return <p className="muted">{t('inbox.empty')}</p>
          return (
            <div className="list">
              {shown.map((r) => (
                <ReferralItem
                  key={r.id}
                  referral={r}
                  canAct={false}
                  onChanged={state.reload}
                  extra={
                    <div className="row">
                      {!r.client_redacted_at && (
                        <button type="button" className="btn btn-outline btn-sm" onClick={() => run(() => redactReferral(r.id), t('admin.redactConfirm'))}>
                          {t('admin.redact')}
                        </button>
                      )}
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => run(() => deleteReferral(r.id), t('admin.deleteConfirm'))}>
                        {t('common.delete')}
                      </button>
                    </div>
                  }
                />
              ))}
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}
