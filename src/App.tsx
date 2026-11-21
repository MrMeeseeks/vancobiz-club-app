import { HashRouter, Route, Routes } from 'react-router-dom'
import { I18nProvider, useI18n } from './i18n'
import { AuthProvider } from './lib/auth'
import { Layout } from './components/Layout'

// Hash routing (#/join, #/app/...) so refreshing any page works on GitHub Pages.
export function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Placeholder />} />
              <Route path="*" element={<Placeholder />} />
            </Route>
          </Routes>
        </HashRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

function Placeholder() {
  const { t } = useI18n()
  return (
    <section className="hero">
      <h1>{t('directory.title')}</h1>
      <p>{t('app.tagline')}</p>
    </section>
  )
}
