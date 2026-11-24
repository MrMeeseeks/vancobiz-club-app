import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { AuthProvider } from './lib/auth'
import { Layout } from './components/Layout'
import { RequireAdmin, RequireMember } from './components/guards'
import { Directory } from './pages/public/Directory'
import { MemberProfile } from './pages/public/MemberProfile'
import { Privacy } from './pages/public/Privacy'
import { Join } from './pages/public/Join'
import { Login } from './pages/public/Login'
import { Survey } from './pages/public/Survey'
import { Dashboard } from './pages/app/Dashboard'
import { SendReferral } from './pages/app/SendReferral'
import { Referrals } from './pages/app/Referrals'
import { Profile } from './pages/app/Profile'
import { AdminLayout } from './pages/admin/AdminLayout'
import { Overview } from './pages/admin/Overview'
import { AllReferrals } from './pages/admin/AllReferrals'
import { Members } from './pages/admin/Members'
import { Requests } from './pages/admin/Requests'
import { SurveyAnswers } from './pages/admin/SurveyAnswers'

// The voice prototype pulls in a large audio library, so it loads only when that page is opened.
const VoiceTest = lazy(() => import('./pages/public/VoiceTest').then((m) => ({ default: m.VoiceTest })))

// Hash routing (#/join, #/app/...) so refreshing any page works on GitHub Pages.
export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            {/* Member survey: its own page without the site menu */}
            <Route path="survey" element={<Survey />} />
            <Route element={<Layout />}>
              {/* Public */}
              <Route index element={<Directory />} />
              <Route path="m/:number" element={<MemberProfile />} />
              <Route path="join" element={<Join />} />
              <Route path="privacy" element={<Privacy />} />
              <Route path="login" element={<Login />} />
              {/* Prototype, not linked from the nav */}
              <Route path="voice-test" element={<Suspense fallback={null}><VoiceTest /></Suspense>} />
              {/* Members */}
              <Route path="app" element={<RequireMember />}>
                <Route index element={<Dashboard />} />
                <Route path="send" element={<SendReferral />} />
                <Route path="referrals" element={<Referrals />} />
                <Route path="profile" element={<Profile />} />
              </Route>
              {/* Admins */}
              <Route path="admin" element={<RequireAdmin />}>
                <Route element={<AdminLayout />}>
                  <Route index element={<Overview />} />
                  <Route path="referrals" element={<AllReferrals />} />
                  <Route path="members" element={<Members />} />
                  <Route path="requests" element={<Requests />} />
                  <Route path="survey" element={<SurveyAnswers />} />
                </Route>
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </I18nProvider>
  )
}
