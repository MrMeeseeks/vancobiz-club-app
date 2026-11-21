import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useI18n } from '../../i18n'
import { listCategories, listMembers } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useAsync } from '../../lib/useAsync'
import { AsyncView, MemberCard } from '../../components/ui'

export function Directory() {
  const { t, pick } = useI18n()
  const { member } = useAuth()
  const state = useAsync(async () => {
    const [categories, members] = await Promise.all([listCategories(), listMembers()])
    return { categories, members: members.filter((m) => m.status === 'active') }
  })
  const [categoryId, setCategoryId] = useState<number | null>(null)

  return (
    <div className="stack">
      <section className="hero">
        <h1>{t('directory.title')}</h1>
        <p>{t('directory.intro')}</p>
      </section>
      <AsyncView state={state}>
        {({ categories, members }) => {
          const used = categories.filter((c) => members.some((m) => m.category_id === c.id))
          const shown = categoryId === null ? members : members.filter((m) => m.category_id === categoryId)
          return (
            <>
              <div className="chips" role="group" aria-label={t('directory.filterLabel')}>
                <button type="button" className="chip" aria-pressed={categoryId === null} onClick={() => setCategoryId(null)}>
                  {t('common.all')}
                </button>
                {used.map((c) => (
                  <button key={c.id} type="button" className="chip" aria-pressed={categoryId === c.id} onClick={() => setCategoryId(c.id)}>
                    {pick(c, 'name')}
                  </button>
                ))}
              </div>
              {shown.length === 0 ? (
                <p className="muted">{t('directory.empty')}</p>
              ) : (
                <div className="grid">
                  {shown.map((m) => (
                    <MemberCard key={m.id} member={m} categories={categories} />
                  ))}
                </div>
              )}
            </>
          )
        }}
      </AsyncView>
      {!member && (
        <p className="center">
          <Link to="/join" className="btn btn-outline">
            {t('directory.joinCta')}
          </Link>
        </p>
      )}
    </div>
  )
}
