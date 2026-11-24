import { useEffect, useRef, useState } from 'react'
import { Conversation } from '@elevenlabs/client'
import { useI18n } from '../../i18n'
import { listMembers } from '../../lib/api'
import { DEFAULT_EXTRA, EXTRA_QUESTIONS, PROFILE_TEXT_FIELDS, type BusinessProfileDraft } from '../../lib/interview'
import { useAsync } from '../../lib/useAsync'
import { AsyncView } from '../../components/ui'

/**
 * PROTOTYPE: voice onboarding interview.
 * The browser talks straight to an ElevenLabs agent (Claude is the brain, configured on the agent).
 * At the end the agent calls the save_business_profile client tool, which hands this page a
 * structured draft. Nothing is stored by this app: the draft stays in the browser until downloaded.
 */
type Lang2 = 'en' | 'fa'
type Line = { role: 'user' | 'agent'; text: string }
type Session = Awaited<ReturnType<typeof Conversation.startSession>>

const ENV_IDS: Record<Lang2, string> = {
  en: (import.meta.env.VITE_ELEVENLABS_AGENT_ID_EN as string | undefined) ?? '',
  fa: (import.meta.env.VITE_ELEVENLABS_AGENT_ID_FA as string | undefined) ?? '',
}
const stored = (k: string) => {
  try {
    return localStorage.getItem(k) ?? ''
  } catch {
    return ''
  }
}

export function VoiceTest() {
  const { t, lang } = useI18n()
  const members = useAsync(listMembers)
  const [talkLang, setTalkLang] = useState<Lang2>(lang)
  const [agentIds, setAgentIds] = useState<Record<Lang2, string>>({
    en: ENV_IDS.en || stored('vbc-agent-en'),
    fa: ENV_IDS.fa || stored('vbc-agent-fa'),
  })
  const [memberNo, setMemberNo] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle')
  const [mode, setMode] = useState<'speaking' | 'listening'>('listening')
  const [lines, setLines] = useState<Line[]>([])
  const [draft, setDraft] = useState<BusinessProfileDraft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const sessionRef = useRef<Session | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)

  // Hang up if the member leaves the page mid-call.
  useEffect(() => () => void sessionRef.current?.endSession().catch(() => undefined), [])
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
  }, [lines])

  function saveAgentId(l: Lang2, value: string) {
    setAgentIds((ids) => ({ ...ids, [l]: value.trim() }))
    try {
      localStorage.setItem(`vbc-agent-${l}`, value.trim())
    } catch {
      /* ignore */
    }
  }

  async function start() {
    const member = members.data?.find((m) => String(m.member_number) === memberNo)
    const agentId = agentIds[talkLang]
    if (!agentId || !consent) return
    setError(null)
    setLines([])
    setDraft(null)
    setStatus('connecting')
    try {
      // Ask for the microphone ourselves so a refusal gives a clear message.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach((track) => track.stop())
    } catch {
      setStatus('idle')
      setError(t('voice.micDenied'))
      return
    }
    try {
      sessionRef.current = await Conversation.startSession({
        agentId,
        connectionType: 'webrtc',
        dynamicVariables: {
          member_name: member ? member.full_name.split(' ')[0] : talkLang === 'fa' ? 'دوست عزیز' : 'there',
          business_type: member?.business_name ?? 'a local business',
          language_name: talkLang === 'fa' ? 'Farsi (Persian)' : 'English',
          extra_question: (member && EXTRA_QUESTIONS[member.member_number]?.[talkLang]) || DEFAULT_EXTRA[talkLang],
        },
        clientTools: {
          // Called by the agent once, at the end of the interview.
          save_business_profile: (params: BusinessProfileDraft) => {
            setDraft(params)
            return 'Saved. The member can now see the written draft on their screen.'
          },
        },
        onConnect: () => setStatus('connected'),
        onDisconnect: () => {
          setStatus('idle')
          sessionRef.current = null
        },
        onModeChange: ({ mode: m }) => setMode(m),
        onMessage: ({ message, role }) => {
          if (message) setLines((prev) => [...prev, { role: role === 'user' ? 'user' : 'agent', text: message }])
        },
        onError: (message) => setError(message),
      })
    } catch (e) {
      setStatus('idle')
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  async function stop() {
    await sessionRef.current?.endSession().catch(() => undefined)
    sessionRef.current = null
    setStatus('idle')
  }

  function download() {
    const blob = new Blob([JSON.stringify({ member_number: memberNo ? Number(memberNo) : null, profile: draft, transcript: lines }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `vancobiz-profile-${memberNo || 'test'}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(draft, null, 2)).catch(() => undefined)
    setCopied(true)
  }

  const live = status !== 'idle'
  const ready = Boolean(agentIds[talkLang]) && consent

  return (
    <div className="stack" style={{ maxInlineSize: 640 }}>
      <section>
        <span className="badge">{t('voice.badge')}</span>
        <h1 style={{ marginBlockStart: 'var(--space-2)' }}>{t('voice.title')}</h1>
        <p className="muted">{t('voice.intro')}</p>
      </section>

      {!live && (
        <div className="form">
          <div className="field">
            <span className="label" id="v-lang">
              {t('voice.language')}
            </span>
            <div className="chips" role="group" aria-labelledby="v-lang">
              <button type="button" className="chip" aria-pressed={talkLang === 'fa'} onClick={() => setTalkLang('fa')} lang="fa">
                فارسی
              </button>
              <button type="button" className="chip" aria-pressed={talkLang === 'en'} onClick={() => setTalkLang('en')} lang="en">
                English
              </button>
            </div>
          </div>
          <div className="field">
            <label htmlFor="v-member">{t('voice.member')}</label>
            <AsyncView state={members}>
              {(list) => (
                <select id="v-member" value={memberNo} onChange={(e) => setMemberNo(e.target.value)}>
                  <option value="">{t('voice.memberNone')}</option>
                  {list.map((m) => (
                    <option key={m.id} value={m.member_number}>
                      {m.member_number}. {m.full_name} · {m.business_name}
                    </option>
                  ))}
                </select>
              )}
            </AsyncView>
          </div>
          {!ENV_IDS[talkLang] && (
            <div className="field">
              <label htmlFor="v-agent">{t('voice.agentId', { lang: talkLang === 'fa' ? 'فارسی' : 'English' })}</label>
              <input id="v-agent" type="text" dir="ltr" placeholder="agent_..." value={agentIds[talkLang]} onChange={(e) => saveAgentId(talkLang, e.target.value)} />
              <span className="hint">{t('voice.agentHint')}</span>
            </div>
          )}
          <div className="panel-soft small">
            <strong>{t('voice.consentTitle')}</strong>
            <ul style={{ margin: 'var(--space-2) 0 0', paddingInlineStart: '1.2em' }}>
              <li>{t('voice.consent1')}</li>
              <li>{t('voice.consent2')}</li>
              <li>{t('voice.consent3')}</li>
            </ul>
          </div>
          <label className="check">
            <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <span>{t('voice.consentCheck')}</span>
          </label>
          <button type="button" className="btn" disabled={!ready} onClick={start}>
            {t('voice.start')}
          </button>
        </div>
      )}

      {live && (
        <div className="panel center stack" aria-live="polite">
          <div className={`voice-orb${status === 'connected' && mode === 'speaking' ? ' is-speaking' : ''}`} aria-hidden="true" />
          <strong>{status === 'connecting' ? t('voice.connecting') : mode === 'speaking' ? t('voice.speaking') : t('voice.listening')}</strong>
          <div>
            <button type="button" className="btn btn-danger" onClick={stop}>
              {t('voice.stop')}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="alert alert-error" role="alert">
          {t('common.error', { message: error })}
        </p>
      )}

      {lines.length > 0 && (
        <section>
          <h2>{t('voice.transcript')}</h2>
          <div className="voice-log" ref={logRef}>
            {lines.map((l, i) => (
              <p key={i} dir="auto" className={l.role === 'user' ? 'voice-user' : 'voice-agent'}>
                <span className="small muted">{l.role === 'user' ? t('voice.you') : t('voice.assistant')}</span>
                <br />
                {l.text}
              </p>
            ))}
          </div>
        </section>
      )}

      {draft && (
        <section className="stack">
          <h2>{t('voice.draftTitle')}</h2>
          <p className="alert alert-gold">{t('voice.draftNote')}</p>
          <div className="item">
            <dl style={{ gridTemplateColumns: '1fr' }}>
              {PROFILE_TEXT_FIELDS.map((f) =>
                draft[f] ? (
                  <div key={f}>
                    <dt>{t(`voice.field.${f}`)}</dt>
                    <dd dir="auto" style={{ whiteSpace: 'pre-line', marginBlockEnd: 'var(--space-3)' }}>
                      {draft[f]}
                    </dd>
                  </div>
                ) : null,
              )}
              {Array.isArray(draft.faqs) && draft.faqs.length > 0 && (
                <div>
                  <dt>{t('voice.field.faqs')}</dt>
                  {draft.faqs.map((q, i) => (
                    <dd key={i} dir="auto" style={{ marginBlockEnd: 'var(--space-3)' }}>
                      <strong>{q.question}</strong>
                      <br />
                      {q.answer}
                    </dd>
                  ))}
                </div>
              )}
            </dl>
          </div>
          <div className="row">
            <button type="button" className="btn" onClick={download}>
              {t('voice.download')}
            </button>
            <button type="button" className="btn btn-outline" onClick={copy}>
              {copied ? t('voice.copied') : t('voice.copy')}
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
