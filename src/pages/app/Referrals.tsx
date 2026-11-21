import { useState } from 'react'
import { useI18n } from '../../i18n'
import { listReferrals } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatNumber } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { ReferralItem } from '../../components/ReferralItem'
import { AsyncView } from '../../components/ui'

export function Referrals() {
  const { t, lang } = useI18n()
  const { member } = useAuth()
  const [tab, setTab] = useState<'received' | 'sent'>('received')
  const state = useAsync(listReferrals)
  if (!member) return null

  return (
    <div>
      <h1>{t('inbox.title')}</h1>
      <AsyncView state={state}>
        {(all) => {
          // An admin's list includes everyone's referrals; this page shows only their own.
          const received = all.filter((r) => r.receiver_id === member.id)
          const sent = all.filter((r) => r.sender_id === member.id)
          const shown = tab === 'received' ? received : sent
          return (
            <>
              <div className="tabs" role="tablist">
                <button type="button" role="tab" className="tab" aria-selected={tab === 'received'} onClick={() => setTab('received')}>
                  {t('inbox.received')} ({formatNumber(lang, received.length)})
                </button>
                <button type="button" role="tab" className="tab" aria-selected={tab === 'sent'} onClick={() => setTab('sent')}>
                  {t('inbox.sent')} ({formatNumber(lang, sent.length)})
                </button>
              </div>
              {shown.length === 0 ? (
                <p className="muted">{t('inbox.empty')}</p>
              ) : (
                <div className="list">
                  {shown.map((r) => (
                    <ReferralItem key={r.id} referral={r} canAct={tab === 'received'} onChanged={state.reload} />
                  ))}
                </div>
              )}
            </>
          )
        }}
      </AsyncView>
    </div>
  )
}
