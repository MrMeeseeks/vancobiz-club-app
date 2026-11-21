import type { Lang } from '../i18n'

const locale = (lang: Lang) => (lang === 'fa' ? 'fa-IR' : 'en-CA')

export function formatNumber(lang: Lang, n: number | null | undefined) {
  return new Intl.NumberFormat(locale(lang)).format(n ?? 0)
}

export function formatMoney(lang: Lang, n: number | null | undefined) {
  return new Intl.NumberFormat(locale(lang), { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }).format(n ?? 0)
}

export function formatDate(lang: Lang, iso: string | null | undefined) {
  if (!iso) return ''
  return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(iso))
}

export function formatMonth(lang: Lang, yyyyMm: string) {
  const [y, m] = yyyyMm.split('-').map(Number)
  return new Intl.DateTimeFormat(locale(lang), { year: 'numeric', month: 'long' }).format(new Date(y, m - 1, 1))
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

export function currentMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
