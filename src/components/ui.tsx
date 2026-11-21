import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../i18n'
import { initials } from '../lib/format'
import type { Category, Member, MemberRef, ReferralStatus } from '../lib/types'

export function Loading() {
  const { t } = useI18n()
  return <p className="muted">{t('common.loading')}</p>
}

export function ErrorNote({ message }: { message: string | null }) {
  const { t } = useI18n()
  if (!message) return null
  return (
    <p className="alert alert-error" role="alert">
      {t('common.error', { message })}
    </p>
  )
}

/** Shows loading / error states, then renders children with the data. */
export function AsyncView<T>({ state, children }: { state: { data: T | null; error: string | null; loading: boolean }; children: (data: T) => ReactNode }) {
  if (state.error) return <ErrorNote message={state.error} />
  if (state.data === null) return state.loading ? <Loading /> : null
  return <>{children(state.data)}</>
}

export function StatusBadge({ status }: { status: ReferralStatus }) {
  const { t } = useI18n()
  return <span className={`badge badge-${status}`}>{t(`status.${status}`)}</span>
}

export function Avatar({ member, large }: { member: Pick<Member, 'full_name' | 'logo_url'>; large?: boolean }) {
  return (
    <span className={`avatar${large ? ' avatar-lg' : ''}`} aria-hidden="true">
      {member.logo_url ? <img src={member.logo_url} alt="" loading="lazy" /> : initials(member.full_name)}
    </span>
  )
}

export function useMemberName() {
  const { pick } = useI18n()
  return (m: MemberRef | Member | null | undefined) => (m ? pick(m, 'full_name') || m.full_name : '—')
}

export function categoryName(categories: Category[], id: number | null, pick: (row: object, base: string) => string) {
  const c = categories.find((x) => x.id === id)
  return c ? pick(c, 'name') : ''
}

/** The gold "membership card". Links to the member's profile unless asLink is false. */
export function MemberCard({ member, categories, asLink = true, large }: { member: Member; categories: Category[]; asLink?: boolean; large?: boolean }) {
  const { t, pick } = useI18n()
  const body = (
    <>
      <div className="top">
        <Avatar member={member} large={large} />
        <div>
          <div className="no">{t('directory.memberNo', { n: String(member.member_number).padStart(2, '0') })}</div>
          <div className="name">{pick(member, 'full_name') || member.full_name}</div>
        </div>
      </div>
      <div className="biz">{pick(member, 'business_name') || member.business_name}</div>
      <div className="cat">{categoryName(categories, member.category_id, pick)}</div>
    </>
  )
  const cls = `member-card${large ? ' profile-card' : ''}`
  return asLink ? (
    <Link to={`/m/${member.member_number}`} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  )
}
