import { NavLink, Outlet } from 'react-router-dom'
import { useI18n } from '../../i18n'

export function AdminLayout() {
  const { t } = useI18n()
  return (
    <div className="stack">
      <nav className="nav" aria-label={t('nav.admin')}>
        <NavLink to="/admin" end>
          {t('adminNav.overview')}
        </NavLink>
        <NavLink to="/admin/referrals">{t('adminNav.referrals')}</NavLink>
        <NavLink to="/admin/members">{t('adminNav.members')}</NavLink>
        <NavLink to="/admin/requests">{t('adminNav.requests')}</NavLink>
        <NavLink to="/admin/survey">{t('adminNav.survey')}</NavLink>
      </nav>
      <Outlet />
    </div>
  )
}
