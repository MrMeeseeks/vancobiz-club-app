import { useState } from 'react'
import { useI18n } from '../../i18n'
import { approveJoinRequest, deleteJoinRequest, listCategories, listJoinRequests, listMembers, rejectJoinRequest } from '../../lib/api'
import { formatDate } from '../../lib/format'
import type { Category, JoinRequest } from '../../lib/types'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { AsyncView, ErrorNote } from '../../components/ui'

export function Requests() {
  const { t } = useI18n()
  const state = useAsync(async () => {
    const [requests, categories, members] = await Promise.all([listJoinRequests(), listCategories(), listMembers()])
    return { requests, categories, nextNumber: Math.max(0, ...members.map((m) => m.member_number)) + 1 }
  })
  return (
    <div className="stack">
      <h1>{t('admin.requestsTitle')}</h1>
      <AsyncView state={state}>
        {({ requests, categories, nextNumber }) =>
          requests.length === 0 ? (
            <p className="muted">{t('common.none')}</p>
          ) : (
            <div className="list">
              {requests.map((r) => (
                <RequestItem key={r.id} request={r} categories={categories} nextNumber={nextNumber} onChanged={state.reload} />
              ))}
            </div>
          )
        }
      </AsyncView>
    </div>
  )
}

function RequestItem({ request: r, categories, nextNumber, onChanged }: { request: JoinRequest; categories: Category[]; nextNumber: number; onChanged: () => void }) {
  const { t, lang, pick } = useI18n()
  const [number, setNumber] = useState(String(nextNumber))
  const [categoryId, setCategoryId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function run(action: () => Promise<void>) {
    setBusy(true)
    setError(null)
    try {
      await action()
      onChanged()
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="item">
      <div className="row">
        <span className={`badge badge-${r.status}`}>{t(`admin.req_${r.status}`)}</span>
        <span className="small muted">{formatDate(lang, r.created_at)}</span>
      </div>
      <dl>
        <dt>{t('join.business')}</dt>
        <dd>{r.business_name}</dd>
        <dt>{t('join.contactName')}</dt>
        <dd>{r.contact_name}</dd>
        <dt>{t('profile.category')}</dt>
        <dd>{r.category_text ?? '—'}</dd>
        <dt>{t('join.email')}</dt>
        <dd className="ltr">{r.email}</dd>
        {r.phone && (
          <>
            <dt>{t('join.phone')}</dt>
            <dd className="ltr">{r.phone}</dd>
          </>
        )}
        {r.reason && (
          <>
            <dt>{t('join.reason')}</dt>
            <dd>{r.reason}</dd>
          </>
        )}
      </dl>
      <ErrorNote message={error} />
      {r.status === 'new' ? (
        <form
          className="row"
          style={{ alignItems: 'flex-end' }}
          onSubmit={(e) => {
            e.preventDefault()
            if (!categoryId) return setError(t('admin.categoryRequired'))
            run(() => approveJoinRequest(r.id, number ? Number(number) : null, Number(categoryId)))
          }}
        >
          <div className="field" style={{ flex: '0 1 140px' }}>
            <label htmlFor={`n-${r.id}`}>{t('admin.approveNumber')}</label>
            <input id={`n-${r.id}`} type="number" min="1" dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} />
          </div>
          <div className="field" style={{ flex: '1 1 180px' }}>
            <label htmlFor={`c-${r.id}`}>{t('admin.approveCategory')}</label>
            <select id={`c-${r.id}`} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {pick(c, 'name')}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-sm" disabled={busy}>
            {t('admin.approve')}
          </button>
          <button type="button" className="btn btn-outline btn-sm" disabled={busy} onClick={() => run(() => rejectJoinRequest(r.id))}>
            {t('admin.reject')}
          </button>
        </form>
      ) : (
        <div className="row">
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={busy}
            onClick={() => window.confirm(t('common.delete') + '?') && run(() => deleteJoinRequest(r.id))}
          >
            {t('common.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
