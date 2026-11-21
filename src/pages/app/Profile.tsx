import { useI18n } from '../../i18n'
import { listCategories } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useAsync } from '../../lib/useAsync'
import { ProfileForm } from '../../components/ProfileForm'
import { AsyncView } from '../../components/ui'

export function Profile() {
  const { t } = useI18n()
  const { member, refresh } = useAuth()
  const state = useAsync(listCategories)
  if (!member) return null
  return (
    <div className="stack">
      <section>
        <h1>{t('profile.title')}</h1>
        <p className="muted">{t('profile.intro')}</p>
      </section>
      <AsyncView state={state}>{(categories) => <ProfileForm member={member} categories={categories} onSaved={refresh} />}</AsyncView>
    </div>
  )
}
