import { Link, NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../i18n'
import { useAuth } from '../lib/auth'
import { isConfigured } from '../lib/supabase'

export function Layout() {
  const { t, lang, setLang } = useI18n()
  const { session, member, isAdmin, signOut } = useAuth()

  return (
    <>
      {!isConfigured && <div className="config-banner">{t('config.missing')}</div>}
      <header className="site-header">
        <div className="container">
          <Link to="/" className="brand">
            {lang === 'fa' ? (
              t('app.name')
            ) : (
              <>
                VancoBiz <span>Club</span>
              </>
            )}
          </Link>
          <span className="spacer" />
          <button
            type="button"
            className="lang-toggle"
            onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
            aria-label={t('nav.languageLabel')}
            lang={lang === 'en' ? 'fa' : 'en'}
          >
            {t('nav.language')}
          </button>
          {session ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={signOut}>
              {t('nav.logout')}
            </button>
          ) : (
            <Link to="/login" className="btn btn-outline btn-sm">
              {t('nav.login')}
            </Link>
          )}
        </div>
        <div className="container">
          <nav className="nav" aria-label="Main">
            <NavLink to="/" end>
              {t('nav.directory')}
            </NavLink>
            {member ? (
              <>
                <NavLink to="/app" end>
                  {t('nav.dashboard')}
                </NavLink>
                <NavLink to="/app/send">{t('nav.send')}</NavLink>
                <NavLink to="/app/referrals">{t('nav.inbox')}</NavLink>
                <NavLink to="/app/profile">{t('nav.profile')}</NavLink>
                {isAdmin && <NavLink to="/admin">{t('nav.admin')}</NavLink>}
              </>
            ) : (
              <NavLink to="/join">{t('nav.join')}</NavLink>
            )}
          </nav>
        </div>
      </header>
      <main>
        <div className="container">
          <Outlet />
        </div>
      </main>
      <footer className="site-footer">
        <div className="container row">
          <span>{t('app.footer')}</span>
          <span className="spacer" />
          <Link to="/privacy">{t('nav.privacy')}</Link>
          {!member && <Link to="/join">{t('nav.join')}</Link>}
        </div>
      </footer>
    </>
  )
}
