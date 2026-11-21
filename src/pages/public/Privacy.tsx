import { useI18n } from '../../i18n'
import { CLUB_CONTACT_EMAIL } from '../../config'

export function Privacy() {
  const { t } = useI18n()
  return (
    <article className="stack" style={{ maxInlineSize: 640 }}>
      <h1>{t('privacy.title')}</h1>
      {['p1', 'p2', 'p3', 'p4', 'p5'].map((k) => (
        <p key={k}>{t(`privacy.${k}`)}</p>
      ))}
      <p className="muted">{t('privacy.contact', { email: CLUB_CONTACT_EMAIL })}</p>
    </article>
  )
}
