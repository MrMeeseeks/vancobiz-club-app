// Creates the two ElevenLabs voice-interview agents (English and Farsi) for the prototype.
//
//   1. Put ELEVENLABS_API_KEY=... in .env (never commit it; .env is gitignored)
//   2. npm run voice:create-agents
//   3. Copy the two agent IDs it prints into the test page (or into .env as
//      VITE_ELEVENLABS_AGENT_ID_EN / VITE_ELEVENLABS_AGENT_ID_FA for local runs)
//
// The agents use Claude as the brain (billed through your ElevenLabs credits) and the
// interviewer script in scripts/voice-agent/prompt.md. Safe to run again: it creates new agents.
import { readFileSync } from 'node:fs'

const API = 'https://api.elevenlabs.io/v1/convai'
const key = process.env.ELEVENLABS_API_KEY
if (!key) {
  console.error('ELEVENLABS_API_KEY is not set. Add it to .env and run: npm run voice:create-agents')
  process.exit(1)
}
// Optional overrides
const LLM = process.env.VOICE_AGENT_LLM || 'claude-sonnet-5-5'
const VOICE_ID = process.env.VOICE_AGENT_VOICE_ID || ''
const TTS_MODEL = process.env.VOICE_AGENT_TTS_MODEL || 'eleven_v4_turbo' // supports Persian

const read = (name) => readFileSync(new URL(`./voice-agent/${name}`, import.meta.url), 'utf8')
const prompt = read('prompt.md')
const tool = JSON.parse(read('save-profile-tool.json'))

async function post(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const text = await res.text()
  let json
  try { json = JSON.parse(text) } catch { json = null }
  return { ok: res.ok, status: res.status, json, text }
}

const FIRST_MESSAGE = {
  en: "Hi {{member_name}}, I'm the VancoBiz Club assistant. I'd like to ask a few questions about your business so our tools can sound like you and get your facts right. Please don't share any client names or personal details. Ready to start?",
  fa: 'سلام {{member_name}}، من دستیار باشگاه ونکوبیز هستم. می‌خواهم چند سؤال درباره کسب‌وکارتان بپرسم تا ابزارهای باشگاه با لحن خود شما و با اطلاعات درست کار کنند. لطفاً نام یا اطلاعات شخصی مشتری‌ها را نگویید. آماده‌اید شروع کنیم؟',
}

function agentBody(lang, toolRef) {
  return {
    name: `VancoBiz interview (${lang})`,
    conversation_config: {
      agent: {
        language: lang,
        first_message: FIRST_MESSAGE[lang],
        prompt: { prompt, llm: LLM, temperature: 0.3, ...toolRef },
        dynamic_variables: {
          dynamic_variable_placeholders: {
            member_name: 'there',
            business_type: 'a local business',
            language_name: lang === 'fa' ? 'Farsi (Persian)' : 'English',
            extra_question: 'What should we know about your business that we have not asked?',
          },
        },
      },
      tts: { model_id: TTS_MODEL, ...(VOICE_ID ? { voice_id: VOICE_ID } : {}) },
      turn: { turn_timeout: 10, turn_eagerness: 'patient' }, // people pause while thinking
      conversation: { max_duration_seconds: 1800 },
    },
    platform_settings: {
      // Prototype guardrails: keep as little as possible, and cap spend if the ID leaks.
      privacy: { record_voice: false, retention_days: 7 },
      call_limits: { daily_limit: 20, agent_concurrency_limit: 2 },
    },
  }
}

// 1) Register the client tool once; fall back to defining it inline if that endpoint refuses.
let toolRef
const created = await post('/tools', { tool_config: tool })
if (created.ok && created.json?.id) {
  toolRef = { tool_ids: [created.json.id] }
  console.log(`Tool save_business_profile created: ${created.json.id}`)
} else {
  console.warn(`Could not create the tool separately (HTTP ${created.status}); defining it inline instead.\n  ${created.text.slice(0, 300)}`)
  toolRef = { tools: [tool] }
}

// 2) One agent per language.
let failed = false
for (const lang of ['en', 'fa']) {
  const res = await post('/agents/create', agentBody(lang, toolRef))
  if (res.ok && res.json?.agent_id) {
    console.log(`\n${lang.toUpperCase()} agent created: ${res.json.agent_id}`)
    console.log(`  VITE_ELEVENLABS_AGENT_ID_${lang.toUpperCase()}=${res.json.agent_id}`)
  } else {
    failed = true
    console.error(`\n${lang.toUpperCase()} agent FAILED (HTTP ${res.status}):\n  ${res.text.slice(0, 800)}`)
  }
}
console.log(
  failed
    ? '\nSomething was refused. The message above says which field; see docs/VOICE_PROTOTYPE.md for the manual dashboard setup.'
    : '\nDone. Paste the IDs into the test page at /#/voice-test, or add the two lines above to .env for local runs.',
)
process.exit(failed ? 1 : 0)
