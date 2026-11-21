import { Link, useParams } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { getMemberByNumber, listCategories } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useAsync } from '../../lib/useAsync'
import { AsyncView, MemberCard } from '../../components/ui'

/** Only http(s) links are rendered, so a profile can't carry a javascript: URL. */
function safeUrl(url: string | null) {
  if (!url) return null
  const withScheme = /^https?:\/\//i.test(url) ? url : `https://${url}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : null
  } catch {
    return null
  }
}

export function MemberProfile() {
  const { number } = useParams()
  const { t, pick } = useI18n()
  const { member: me } = useAuth()
  const state = useAsync(async () => {
    const [categories, member] = await Promise.all([listCategories(), getMemberByNumber(Number(number))])
    return { categories, member }
  }, [number])

  return (
    <div className="stack">
      <Link to="/" className="small">
        ← {t('common.back')}
      </Link>
      <AsyncView state={state}>
        {({ categories, member }) => {
          if (!member) return <p className="muted">{t('member.notFound')}</p>
          const bio = pick(member, 'bio')
          const site = safeUrl(member.website)
          const name = pick(member, 'full_name') || member.full_name
          return (
            <>
              <MemberCard member={member} categories={categories} asLink={false} large />
              {bio && <p style={{ maxInlineSize: 640, whiteSpace: 'pre-line' }}>{bio}</p>}
              <div className="row">
                {member.phone && (
                  <a className="btn" href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}>
                    {t('member.call')} <span className="ltr">{member.phone}</span>
                  </a>
                )}
                {member.public_email && (
                  <a className="btn btn-outline" href={`mailto:${member.public_email}`}>
                    {t('member.email')}
                  </a>
                )}
                {site && (
                  <a className="btn btn-outline" href={site} target="_blank" rel="noopener noreferrer">
                    {t('member.website')}
                  </a>
                )}
                {me && me.id !== member.id && (
                  <Link className="btn btn-outline" to={`/app/send?to=${member.id}`}>
                    {t('member.sendReferral', { name })}
                  </Link>
                )}
              </div>
            </>
          )
        }}
      </AsyncView>
    </div>
  )
}
