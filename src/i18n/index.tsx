import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import en from './en.json'
import fa from './fa.json'

/**
 * Tiny i18n: every UI string lives in en.json / fa.json.
 * t('nav.directory') looks up a dotted key; {name}-style placeholders are filled from vars.
 * Missing Farsi keys fall back to English, then to the key itself.
 */
export type Lang = 'en' | 'fa'
type Dict = { [key: string]: string | Dict }
const dicts: Record<Lang, Dict> = { en, fa }
const STORAGE_KEY = 'vbc-lang'

function lookup(dict: Dict, key: string): string | undefined {
  let node: string | Dict | undefined = dict
  for (const part of key.split('.')) {
    if (node === undefined || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const raw = lookup(dicts[lang], key) ?? lookup(dicts.en, key) ?? key
  if (!vars) return raw
  return raw.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m))
}

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'fa') return saved
  } catch {
    /* storage unavailable */
  }
  return navigator.language?.toLowerCase().startsWith('fa') ? 'fa' : 'en'
}

type I18nValue = {
  lang: Lang
  dir: 'ltr' | 'rtl'
  setLang: (l: Lang) => void
  t: (key: string, vars?: Record<string, string | number>) => string
  /** Pick a bilingual field: pick(row, 'bio') returns row.bio_fa in Farsi when present, else row.bio_en. */
  pick: (row: object | null | undefined, base: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)
  const dir = lang === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
    document.title = translate(lang, 'app.name')
  }, [lang, dir])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try {
      localStorage.setItem(STORAGE_KEY, l)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo<I18nValue>(
    () => ({
      lang,
      dir,
      setLang,
      t: (key, vars) => translate(lang, key, vars),
      pick: (row, base) => {
        const r = (row ?? {}) as Record<string, unknown>
        const faVal = r[`${base}_fa`]
        const enVal = r[`${base}_en`] ?? r[base]
        if (lang === 'fa' && typeof faVal === 'string' && faVal.trim()) return faVal
        return typeof enVal === 'string' ? enVal : ''
      },
    }),
    [lang, dir, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used inside I18nProvider')
  return ctx
}
