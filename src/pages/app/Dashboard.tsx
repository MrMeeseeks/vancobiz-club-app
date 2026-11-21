import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { listReferrals, listUnreadNotifications, markNotificationRead, myStats } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { formatMoney, formatNumber } from '../../lib/format'
import { useAsync } from '../../lib/useAsync'
import { AsyncView, useMemberName } from '../../components/ui'

export function Dashboard() {
  const { t, lang, pick } = useI18n()
  const { member } = useAuth()
  const nameOf = useMemberName()
  const state = useAsync(async () => {
    const [stats, notifications, referrals] = await Promise.all([myStats(), listUnreadNotifications(), listReferrals()])
    return { stats, notifications, referrals }
  })
  if (!member) return null

  async function dismiss(id: number) {
    await markNotificationRead(id).catch(() => undefined)
    state.reload()
  }

  return (
    <div className="stack">
      <h1>{t('dashboard.title', { name: (pick(member, 'full_name') || member.full_name).split(' ')[0] })}</h1>
      <AsyncView state={state}>
        {({ stats, notifications, referrals }) => {
          const byId = new Map(referrals.map((r) => [r.id, r]))
          const pending = referrals.filter((r) => r.receiver_id === member.id && r.status === 'pending').length
          return (
            <>
              {notifications.map((n) => {
                const r = n.referral_id ? byId.get(n.referral_id) : undefined
                if (!r) return null
                const won = n.kind === 'referral_won'
                return (
                  <div key={n.id} className={`alert ${won ? 'alert-success' : 'alert-gold'} row`}>
                    <span>
                      {won ? t('dashboard.thanksBody', { name: nameOf(r.receiver) }) : t('dashboard.newReferral', { name: nameOf(r.sender) })}
                    </span>
                    <span className="spacer" />
                    {!won && (
                      <Link to="/app/referrals" className="btn btn-sm">
                        {t('dashboard.openInbox')}
                      </Link>
                    )}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => dismiss(n.id)}>
                      {t('dashboard.dismiss')}
                    </button>
                  </div>
                )
              })}
              {pending > 0 && notifications.every((n) => n.kind !== 'referral_received') && (
                <p className="alert alert-gold row">
                  <span>{t('dashboard.pendingCount', { n: formatNumber(lang, pending) })}</span>
                  <span className="spacer" />
                  <Link to="/app/referrals" className="btn btn-sm">
                    {t('dashboard.openInbox')}
                  </Link>
                </p>
              )}
              <div className="stats">
                <div className="stat">
                  <div className="value">{formatNumber(lang, stats.sent)}</div>
                  <div className="label">{t('dashboard.sent')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatNumber(lang, stats.received)}</div>
                  <div className="label">{t('dashboard.received')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatNumber(lang, stats.won_received)}</div>
                  <div className="label">{t('dashboard.won')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatMoney(lang, stats.value_received)}</div>
                  <div className="label">{t('dashboard.value')}</div>
                </div>
              </div>
              {stats.sent_won > 0 && <p className="muted">{t('dashboard.generated', { value: formatMoney(lang, stats.value_generated) })}</p>}
              <div className="row">
                <Link to="/app/send" className="btn">
                  {t('dashboard.sendCta')}
                </Link>
                <Link to="/app/referrals" className="btn btn-outline">
                  {t('dashboard.openInbox')}
                </Link>
              </div>
            </>
          )
        }}
      </AsyncView>
    </div>
  )
}
