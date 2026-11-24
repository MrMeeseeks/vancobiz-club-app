import { useI18n } from '../../i18n'
import { deleteSurveyResponse, listMembers, listSurveyResponses } from '../../lib/api'
import { downloadCsv, toCsv } from '../../lib/csv'
import { formatDate } from '../../lib/format'
import type { SurveyResponse } from '../../lib/types'
import { useAsync } from '../../lib/useAsync'
import { AsyncView } from '../../components/ui'

const TEXT_FIELDS = ['time_sink', 'repeat_questions', 'lost_client', 'ai_tools', 'ai_use', 'one_wish'] as const

export function SurveyAnswers() {
  const { t, lang } = useI18n()
  const state = useAsync(async () => {
    const [responses, members] = await Promise.all([listSurveyResponses(), listMembers()])
    const names = new Map(members.map((m) => [m.member_number, `${m.full_name} · ${m.business_name}`]))
    return { responses, names }
  })
  const who = (r: SurveyResponse, names: Map<number, string>) =>
    r.member_number === null ? t('survey.whoNone') : (names.get(r.member_number) ?? `#${r.member_number}`)

  function exportCsv(responses: SurveyResponse[], names: Map<number, string>) {
    const headers = ['date', 'member', ...TEXT_FIELDS, 'ok_to_chat', 'language']
    const rows = responses.map((r) => [r.created_at.slice(0, 10), who(r, names), ...TEXT_FIELDS.map((f) => r[f]), r.ok_to_chat ? 'yes' : 'no', r.lang])
    downloadCsv('vancobiz-survey.csv', toCsv(headers, rows))
  }

  return (
    <div className="stack">
      <h1>{t('admin.surveyTitle')}</h1>
      <p className="muted">
        {t('admin.surveyLink')}{' '}
        <a href="#/survey" className="ltr">
          #/survey
        </a>
      </p>
      <AsyncView state={state}>
        {({ responses, names }) =>
          responses.length === 0 ? (
            <p className="muted">{t('common.none')}</p>
          ) : (
            <>
              <div className="row">
                <strong>{t('admin.surveyCount', { n: responses.length })}</strong>
                <span className="spacer" />
                <button type="button" className="btn btn-outline btn-sm" onClick={() => exportCsv(responses, names)}>
                  {t('admin.exportCsv')}
                </button>
              </div>
              <div className="list">
                {responses.map((r) => (
                  <div className="item" key={r.id}>
                    <div className="row">
                      <strong>{who(r, names)}</strong>
                      {r.ok_to_chat && <span className="badge badge-approved">{t('admin.surveyOkToChat')}</span>}
                      <span className="spacer" />
                      <span className="small muted">{formatDate(lang, r.created_at)}</span>
                    </div>
                    <dl>
                      {TEXT_FIELDS.filter((f) => r[f]).map((f) => (
                        <div key={f} style={{ display: 'contents' }}>
                          <dt>{t(`admin.surveyField.${f}`)}</dt>
                          <dd dir="auto">{r[f]}</dd>
                        </div>
                      ))}
                    </dl>
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={async () => {
                          if (!window.confirm(t('common.delete') + '?')) return
                          await deleteSurveyResponse(r.id)
                          state.reload()
                        }}
                      >
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )
        }
      </AsyncView>
    </div>
  )
}
