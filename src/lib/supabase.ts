import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** False until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set (.env locally, repo secrets in CI). */
export const isConfigured = Boolean(url && anonKey)

/**
 * PKCE flow: the magic link returns as ?code=... in the query string, which does not
 * clash with the app's #/hash routes on GitHub Pages.
 */
export const supabase = createClient(url || 'http://localhost:54321', anonKey || 'not-configured', {
  auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
})
