import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n'
import { listAccounts, listCategories, listMembers, saveMember, type AccountRow, type SaveMemberInput } from '../../lib/api'
import { formatDate } from '../../lib/format'
import type { Category, Member, Role } from '../../lib/types'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { ProfileForm } from '../../components/ProfileForm'
import { AsyncView, categoryName, ErrorNote } from '../../components/ui'

type Editing = { member: Member | null; account: AccountRow | null }

export function Members() {
  const { t, lang, pick } = useI18n()
  const state = useAsync(async () => {
    const [members, accounts, categories] = await Promise.all([listMembers(), listAccounts(), listCategories()])
    return { members, accounts, categories }
  })
  const [editing, setEditing] = useState<Editing | null>(null)

  return (
    <div className="stack">
      <div className="row">
        <h1 style={{ margin: 0 }}>{t('admin.membersTitle')}</h1>
        <span className="spacer" />
        {!editing && (
          <button type="button" className="btn btn-sm" onClick={() => setEditing({ member: null, account: null })}>
            {t('admin.addMember')}
          </button>
        )}
      </div>
      <AsyncView state={state}>
        {({ members, accounts, categories }) => {
          if (editing) {
            return (
              <MemberEditor
                key={editing.member?.id ?? 'new'}
                editing={editing}
                categories={categories}
                nextNumber={Math.max(0, ...members.map((m) => m.member_number)) + 1}
                onClose={() => setEditing(null)}
                onSaved={state.reload}
              />
            )
          }
          const accountOf = (id: string) => accounts.find((a) => a.member_id === id) ?? null
          return (
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>{t('admin.member')}</th>
                      <th>{t('profile.category')}</th>
                      <th>{t('admin.loginEmail')}</th>
                      <th>{t('admin.role')}</th>
                      <th>{t('admin.status')}</th>
                      <th>{t('admin.linked')}</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m) => {
                      const a = accountOf(m.id)
                      return (
                        <tr key={m.id}>
                          <td>{m.member_number}</td>
                          <td>
                            {m.full_name}
                            <div className="small muted">{m.business_name}</div>
                          </td>
                          <td>{categoryName(categories, m.category_id, pick)}</td>
                          <td className="ltr">{a?.login_email ?? '—'}</td>
                          <td>{a ? t(`admin.role_${a.role}`) : '—'}</td>
                          <td>
                            <span className={`badge badge-${m.status}`}>{t(`admin.status_${m.status}`)}</span>
                          </td>
                          <td className="small">{a?.last_sign_in_at ? formatDate(lang, a.last_sign_in_at) : t('admin.notLinked')}</td>
                          <td>
                            <button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing({ member: m, account: a })}>
                              {t('common.edit')}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              {accounts
                .filter((a) => !a.member_id)
                .map((a) => (
                  <p key={a.account_id} className="small muted">
                    {t('admin.role_admin')}: <span className="ltr">{a.login_email}</span>
                  </p>
                ))}
            </>
          )
        }}
      </AsyncView>
    </div>
  )
}

function MemberEditor({ editing, categories, nextNumber, onClose, onSaved }: { editing: Editing; categories: Category[]; nextNumber: number; onClose: () => void; onSaved: () => void }) {
  const { t, pick } = useI18n()
  const { member, account } = editing
  const [number, setNumber] = useState(String(member?.member_number ?? nextNumber))
  const [fullName, setFullName] = useState(member?.full_name ?? '')
  const [business, setBusiness] = useState(member?.business_name ?? '')
  const [categoryId, setCategoryId] = useState<number | null>(member?.category_id ?? null)
  const [loginEmail, setLoginEmail] = useState(account?.login_email ?? '')
  const [role, setRole] = useState<Role>(account?.role ?? 'member')
  const [status, setStatus] = useState<'active' | 'inactive'>(member?.status ?? 'active')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const input: SaveMemberInput = {
      member_id: member?.id ?? null,
      member_number: number ? Number(number) : null,
      full_name: fullName,
      business_name: business,
      category_id: categoryId,
      login_email: loginEmail,
      role,
      status,
    }
    try {
      await saveMember(input)
      onSaved()
      if (member) setSaved(true)
      else onClose()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="stack">
      <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>
        ← {t('common.back')}
      </button>
      <h2>{member ? t('admin.editMember') : t('admin.addMember')}</h2>
      <form className="form panel-soft" onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="m-number">{t('admin.memberNumber')}</label>
          <input id="m-number" type="number" min="1" required dir="ltr" value={number} onChange={(e) => setNumber(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-name">{t('profile.full_name')}</label>
          <input id="m-name" type="text" required maxLength={120} dir="ltr" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-business">{t('profile.business_name')}</label>
          <input id="m-business" type="text" required maxLength={160} dir="ltr" value={business} onChange={(e) => setBusiness(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="m-category">{t('profile.category')}</label>
          <select id="m-category" value={categoryId ?? ''} onChange={(e) => setCategoryId(e.target.value === '' ? null : Number(e.target.value))}>
            <option value="">—</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {pick(c, 'name')}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-email">{t('admin.loginEmail')}</label>
          <input id="m-email" type="email" required maxLength={200} dir="ltr" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} aria-describedby="m-email-hint" />
          <span id="m-email-hint" className="hint">
            {t('admin.loginEmailHint')}
          </span>
        </div>
        <div className="field">
          <label htmlFor="m-role">{t('admin.role')}</label>
          <select id="m-role" value={role} onChange={(e) => setRole(e.target.value as Role)}>
            <option value="member">{t('admin.role_member')}</option>
            <option value="admin">{t('admin.role_admin')}</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="m-status">{t('admin.status')}</label>
          <select id="m-status" value={status} onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}>
            <option value="active">{t('admin.status_active')}</option>
            <option value="inactive">{t('admin.status_inactive')}</option>
          </select>
        </div>
        <ErrorNote message={error} />
        {saved && <p className="alert alert-success">{t('common.saved')}</p>}
        <button className="btn" type="submit" disabled={busy}>
          {t('common.save')}
        </button>
      </form>
      {member && (
        <>
          <h2>{t('profile.title')}</h2>
          <ProfileForm member={member} categories={categories} onSaved={onSaved} />
        </>
      )}
    </div>
  )
}
