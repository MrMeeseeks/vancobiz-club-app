import { useState } from 'react'
import { useI18n } from '../../i18n'
import { listCategories, listMembers, listReferrals, monthReport } from '../../lib/api'
import { downloadCsv, toCsv } from '../../lib/csv'
import { currentMonth, formatMoney, formatMonth, formatNumber } from '../../lib/format'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { AsyncView, categoryName, ErrorNote } from '../../components/ui'

export function Overview() {
  const { t, lang, pick } = useI18n()
  const [month, setMonth] = useState(currentMonth())
  const [exportError, setExportError] = useState<string | null>(null)
  const state = useAsync(async () => {
    const [report, categories] = await Promise.all([monthReport(month), listCategories()])
    return { report, categories }
  }, [month])

  /** Referrals created in the chosen month. No client names or contact details are exported. */
  async function exportCsv() {
    setExportError(null)
    try {
      const [referrals, members, categories] = await Promise.all([listReferrals(), listMembers(), listCategories()])
      const cat = (memberId: string) => categories.find((c) => c.id === members.find((m) => m.id === memberId)?.category_id)?.name_en ?? ''
      const inMonth = referrals.filter((r) => {
        const d = new Date(r.created_at)
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}` === month
      })
      const csv = toCsv(
        ['referral_id', 'created_at', 'sender_no', 'sender', 'sender_category', 'receiver_no', 'receiver', 'receiver_category', 'status', 'deal_value_cad', 'responded_at', 'closed_at'],
        inMonth.map((r) => [
          r.id,
          r.created_at,
          r.sender?.member_number,
          r.sender?.full_name,
          cat(r.sender_id),
          r.receiver?.member_number,
          r.receiver?.full_name,
          cat(r.receiver_id),
          r.status,
          r.deal_value_cad,
          r.responded_at,
          r.closed_at,
        ]),
      )
      downloadCsv(`vancobiz-referrals-${month}.csv`, csv)
    } catch (e) {
      setExportError(errorMessage(e))
    }
  }

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{t('admin.overviewTitle')}</h1>
        <span className="spacer" />
        <div className="field">
          <label htmlFor="a-month" className="small">
            {t('admin.month')}
          </label>
          <input id="a-month" type="month" dir="ltr" value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
      </div>
      <AsyncView state={state}>
        {({ report, categories }) => {
          const maxFlow = Math.max(1, ...report.flow.map((f) => f.count))
          const rate = report.total > 0 ? Math.round((report.accepted / report.total) * 100) : 0
          return (
            <>
              <p className="alert alert-gold" style={{ fontSize: 'var(--text-lg)' }}>
                {t('admin.headline', { value: formatMoney(lang, report.won_value) })}
                <span className="small muted"> · {formatMonth(lang, month)}</span>
              </p>
              <div className="stats">
                <div className="stat">
                  <div className="value">{formatNumber(lang, report.total)}</div>
                  <div className="label">{t('admin.referralsMade')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatNumber(lang, rate)}%</div>
                  <div className="label">{t('admin.acceptRate')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatNumber(lang, report.won)}</div>
                  <div className="label">{t('admin.wonCount')}</div>
                </div>
                <div className="stat">
                  <div className="value">{formatMoney(lang, report.won_value)}</div>
                  <div className="label">{t('admin.wonValue')}</div>
                </div>
              </div>
              <p className="muted small">
                {t('admin.allTime', { count: formatNumber(lang, report.all_time_total), value: formatMoney(lang, report.all_time_won_value) })}
              </p>

              <section>
                <h2>{t('admin.topReferrers')}</h2>
                {report.top_referrers.length === 0 ? (
                  <p className="muted">{t('admin.noData')}</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('admin.member')}</th>
                          <th>{t('admin.sentCol')}</th>
                          <th>{t('admin.wonCol')}</th>
                          <th>{t('admin.valueCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_referrers.map((r) => (
                          <tr key={r.member_id}>
                            <td>{pick(r, 'full_name') || r.full_name}</td>
                            <td>{formatNumber(lang, r.sent)}</td>
                            <td>{formatNumber(lang, r.won)}</td>
                            <td>{formatMoney(lang, r.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h2>{t('admin.flow')}</h2>
                {report.flow.length === 0 ? (
                  <p className="muted">{t('admin.noData')}</p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>{t('admin.flowFrom')}</th>
                          <th>{t('admin.flowTo')}</th>
                          <th>{t('admin.count')}</th>
                          <th>{t('admin.wonCol')}</th>
                          <th>{t('admin.valueCol')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.flow.map((f) => (
                          <tr key={`${f.from_category_id}-${f.to_category_id}`}>
                            <td>{categoryName(categories, f.from_category_id, pick) || '—'}</td>
                            <td>{categoryName(categories, f.to_category_id, pick) || '—'}</td>
                            <td>
                              <div className="row" style={{ flexWrap: 'nowrap' }}>
                                <span>{formatNumber(lang, f.count)}</span>
                                <span className="flow-bar" style={{ inlineSize: `${(f.count / maxFlow) * 80}px` }} />
                              </div>
                            </td>
                            <td>{formatNumber(lang, f.won)}</td>
                            <td>{formatMoney(lang, f.value)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )
        }}
      </AsyncView>
      <section>
        <button type="button" className="btn btn-outline" onClick={exportCsv}>
          {t('admin.exportCsv')} · {formatMonth(lang, month)}
        </button>
        <p className="hint">{t('admin.csvHint')}</p>
        <ErrorNote message={exportError} />
      </section>
    </div>
  )
}
