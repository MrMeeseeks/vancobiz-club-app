import { useState, type FormEvent } from 'react'
import { useI18n } from '../../i18n'
import { listMembers, submitSurvey, type SurveyInput } from '../../lib/api'
import { isConfigured } from '../../lib/supabase'
import { errorMessage, useAsync } from '../../lib/useAsync'
import { ErrorNote } from '../../components/ui'
import { TileCube } from '../../components/TileCube'

// Product names stay in English in both languages; "other" and "none" are translated.
export const AI_TOOLS = ['ChatGPT', 'Gemini', 'Claude', 'Copilot', 'other', 'none'] as const
const MAX = 1000

type TextKey = 'time_sink' | 'repeat_questions' | 'lost_client' | 'ai_use' | 'one_wish'
const emptyText: Record<TextKey, string> = { time_sink: '', repeat_questions: '', lost_client: '', ai_use: '', one_wish: '' }

/** A standalone page (no site menu) so members who open Amin's link see only the survey. */
export function Survey() {
  const { t, lang, setLang, pick } = useI18n()
  const members = useAsync(listMembers)
  const [memberNumber, setMemberNumber] = useState('')
  const [text, setText] = useState(emptyText)
  const [tools, setTools] = useState<string[]>([])
  const [okToChat, setOkToChat] = useState(false)
  const [trap, setTrap] = useState('') // honeypot: real people never fill this
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const set = (k: TextKey) => (e: { target: { value: string } }) => setText({ ...text, [k]: e.target.value })
  const toolLabel = (tool: string) => (tool === 'other' || tool === 'none' ? t(`survey.tool_${tool}`) : tool)

  function toggleTool(tool: string) {
    // "None" and the real tools exclude each other.
    if (tool === 'none') return setTools(tools.includes('none') ? [] : ['none'])
    const rest = tools.filter((x) => x !== 'none')
    setTools(rest.includes(tool) ? rest.filter((x) => x !== tool) : [...rest, tool])
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (trap) return setDone(true)
    setBusy(true)
    setError(null)
    const input: SurveyInput = {
      member_number: memberNumber ? Number(memberNumber) : null,
      ...text,
      // Stored in English so the answers sort and export the same way in both languages.
      ai_tools: AI_TOOLS.filter((x) => tools.includes(x)).join(', '),
      ok_to_chat: okToChat,
      lang,
    }
    try {
      await submitSurvey(input)
      setDone(true)
      window.scrollTo({ top: 0 })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  const question = (n: number, key: TextKey, required = false) => (
    <div className="survey-q">
      <label htmlFor={`s-${key}`}>
        <span className="survey-n" aria-hidden="true">
          {n.toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-CA')}
        </span>
        <span>
          {t(`survey.q.${key}`)}
          {!required && <span className="muted survey-opt"> ({t('common.optional')})</span>}
        </span>
      </label>
      <p className="hint">{t(`survey.hint.${key}`)}</p>
      <textarea id={`s-${key}`} required={required} maxLength={MAX} value={text[key]} onChange={set(key)} />
    </div>
  )

  return (
    <div className="survey-page">
      <header className="survey-top">
        <button
          type="button"
          className="lang-toggle"
          onClick={() => setLang(lang === 'en' ? 'fa' : 'en')}
          aria-label={t('nav.languageLabel')}
          lang={lang === 'en' ? 'fa' : 'en'}
        >
          {t('nav.language')}
        </button>
        <TileCube label={t('survey.logoLabel')} />
        <p className="survey-wordmark" dir="ltr">
          Vanco<span>Biz</span> <small>Club</small>
        </p>
      </header>

      <main className="survey-main">
        {done ? (
          <section className="survey-done" role="status">
            <h1>{t('survey.thanksTitle')}</h1>
            <p>{t(isConfigured ? 'survey.thanksBody' : 'survey.previewDone')}</p>
          </section>
        ) : (
          <>
            <section className="survey-intro">
              <h1>{t('survey.title')}</h1>
              <p>{t('survey.intro')}</p>
              <p className="survey-meta">{t('survey.meta')}</p>
            </section>

            {!isConfigured && <p className="alert alert-gold">{t('survey.previewNote')}</p>}

            <form className="survey-form" onSubmit={onSubmit}>
              <div className="survey-q">
                <label htmlFor="s-member">
                  <span>
                    {t('survey.who')}
                    <span className="muted survey-opt"> ({t('common.optional')})</span>
                  </span>
                </label>
                <select id="s-member" value={memberNumber} onChange={(e) => setMemberNumber(e.target.value)}>
                  <option value="">{t('survey.whoNone')}</option>
                  {(members.data ?? []).map((m) => (
                    <option key={m.id} value={m.member_number}>
                      {(lang === 'fa' && m.full_name_fa) || m.full_name}
                      {' · '}
                      {pick(m, 'business_name') || m.business_name}
                    </option>
                  ))}
                </select>
              </div>

              {question(1, 'time_sink', true)}
              {question(2, 'repeat_questions')}
              {question(3, 'lost_client')}

              <div className="survey-q">
                <span className="label survey-label" id="s-tools-label">
                  <span className="survey-n" aria-hidden="true">
                    {(4).toLocaleString(lang === 'fa' ? 'fa-IR' : 'en-CA')}
                  </span>
                  <span>
                    {t('survey.q.ai_tools')}
                    <span className="muted survey-opt"> ({t('common.optional')})</span>
                  </span>
                </span>
                <div className="survey-chips" role="group" aria-labelledby="s-tools-label">
                  {AI_TOOLS.map((tool) => (
                    <button key={tool} type="button" className="chip" aria-pressed={tools.includes(tool)} onClick={() => toggleTool(tool)}>
                      {toolLabel(tool)}
                    </button>
                  ))}
                </div>
                <label htmlFor="s-ai_use" className="hint survey-sub">
                  {t('survey.q.ai_use')}
                </label>
                <textarea id="s-ai_use" maxLength={MAX} value={text.ai_use} onChange={set('ai_use')} />
              </div>

              {question(5, 'one_wish')}

              <label className="check">
                <input type="checkbox" checked={okToChat} onChange={(e) => setOkToChat(e.target.checked)} />
                <span>{t('survey.okToChat')}</span>
              </label>

              <div className="honeypot" aria-hidden="true">
                <label htmlFor="s-website">Website</label>
                <input id="s-website" type="text" tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} />
              </div>

              <p className="survey-privacy">{t('survey.privacy')}</p>
              <ErrorNote message={error} />
              <button className="btn survey-submit" type="submit" disabled={busy}>
                {busy ? t('survey.sending') : t('survey.submit')}
              </button>
            </form>
          </>
        )}
      </main>

      <footer className="survey-foot">{t('app.footer')}</footer>
    </div>
  )
}
