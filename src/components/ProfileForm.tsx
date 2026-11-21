import { useState, type FormEvent } from 'react'
import { useI18n } from '../i18n'
import { updateProfile, type ProfilePatch } from '../lib/api'
import type { Category, Member } from '../lib/types'
import { errorMessage } from '../lib/useAsync'
import { ErrorNote, MemberCard } from './ui'

type TextKey = 'full_name' | 'full_name_fa' | 'business_name' | 'business_name_fa' | 'bio_en' | 'bio_fa' | 'logo_url' | 'public_email' | 'phone' | 'website'

/** Public profile editor. Used by a member for their own profile and by admins for anyone's. */
export function ProfileForm({ member, categories, onSaved }: { member: Member; categories: Category[]; onSaved: () => void }) {
  const { t, pick } = useI18n()
  const [form, setForm] = useState({
    full_name: member.full_name,
    full_name_fa: member.full_name_fa ?? '',
    business_name: member.business_name,
    business_name_fa: member.business_name_fa ?? '',
    bio_en: member.bio_en ?? '',
    bio_fa: member.bio_fa ?? '',
    logo_url: member.logo_url ?? '',
    public_email: member.public_email ?? '',
    phone: member.phone ?? '',
    website: member.website ?? '',
  })
  const [categoryId, setCategoryId] = useState<number | null>(member.category_id)
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const bind = (k: TextKey) => ({
    id: `p-${k}`,
    value: form[k],
    onChange: (e: { target: { value: string } }) => {
      setForm({ ...form, [k]: e.target.value })
      setSaved(false)
    },
  })

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const orNull = (s: string) => (s.trim() === '' ? null : s.trim())
    const patch: ProfilePatch = {
      full_name: form.full_name.trim(),
      full_name_fa: orNull(form.full_name_fa),
      business_name: form.business_name.trim(),
      business_name_fa: orNull(form.business_name_fa),
      category_id: categoryId,
      bio_en: orNull(form.bio_en),
      bio_fa: orNull(form.bio_fa),
      logo_url: orNull(form.logo_url),
      public_email: orNull(form.public_email),
      phone: orNull(form.phone),
      website: orNull(form.website),
    }
    try {
      await updateProfile(member.id, patch)
      setSaved(true)
      onSaved()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const preview: Member = { ...member, ...form, category_id: categoryId, logo_url: form.logo_url || null, full_name_fa: form.full_name_fa || null, business_name_fa: form.business_name_fa || null }

  return (
    <form className="form" onSubmit={onSubmit}>
      <div>
        <div className="label">{t('profile.preview')}</div>
        <MemberCard member={preview} categories={categories} asLink={false} large />
      </div>
      <div className="field">
        <label htmlFor="p-full_name">{t('profile.full_name')}</label>
        <input type="text" required maxLength={120} dir="ltr" {...bind('full_name')} />
      </div>
      <div className="field">
        <label htmlFor="p-full_name_fa">{t('profile.full_name_fa')}</label>
        <input type="text" maxLength={120} dir="rtl" lang="fa" {...bind('full_name_fa')} />
      </div>
      <div className="field">
        <label htmlFor="p-business_name">{t('profile.business_name')}</label>
        <input type="text" required maxLength={160} dir="ltr" {...bind('business_name')} />
      </div>
      <div className="field">
        <label htmlFor="p-business_name_fa">{t('profile.business_name_fa')}</label>
        <input type="text" maxLength={160} dir="rtl" lang="fa" {...bind('business_name_fa')} />
      </div>
      <div className="field">
        <label htmlFor="p-category">{t('profile.category')}</label>
        <select
          id="p-category"
          value={categoryId ?? ''}
          onChange={(e) => {
            setCategoryId(e.target.value === '' ? null : Number(e.target.value))
            setSaved(false)
          }}
        >
          <option value="">—</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {pick(c, 'name')}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="p-bio_en">{t('profile.bio_en')}</label>
        <textarea maxLength={600} dir="ltr" {...bind('bio_en')} />
        <span className="hint">{t('profile.bioHint')}</span>
      </div>
      <div className="field">
        <label htmlFor="p-bio_fa">{t('profile.bio_fa')}</label>
        <textarea maxLength={600} dir="rtl" lang="fa" {...bind('bio_fa')} />
      </div>
      <div className="field">
        <label htmlFor="p-public_email">{t('profile.public_email')}</label>
        <input type="email" maxLength={200} dir="ltr" {...bind('public_email')} />
      </div>
      <div className="field">
        <label htmlFor="p-phone">{t('profile.phone')}</label>
        <input type="tel" maxLength={40} dir="ltr" {...bind('phone')} />
      </div>
      <div className="field">
        <label htmlFor="p-website">{t('profile.website')}</label>
        <input type="text" maxLength={300} dir="ltr" inputMode="url" {...bind('website')} />
      </div>
      <div className="field">
        <label htmlFor="p-logo_url">{t('profile.logo_url')}</label>
        <input type="url" maxLength={500} dir="ltr" {...bind('logo_url')} />
        <span className="hint">{t('profile.logoHint')}</span>
      </div>
      <ErrorNote message={error} />
      {saved && <p className="alert alert-success">{t('common.saved')}</p>}
      <button className="btn" type="submit" disabled={busy}>
        {t('common.save')}
      </button>
    </form>
  )
}
