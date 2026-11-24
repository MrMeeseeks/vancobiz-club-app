// Every call the app makes to Supabase lives here. Row Level Security decides what comes back.
import { isConfigured, supabase } from './supabase'
import { demoCategories, demoMembers } from './demo'
import {
  MEMBER_REF_COLUMNS,
  type Category,
  type JoinRequest,
  type Member,
  type MonthReport,
  type MyStats,
  type Notification,
  type ReferralStatus,
  type ReferralWithMembers,
  type Role,
  type SurveyResponse,
} from './types'

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

// ---- Public ----
export async function listCategories(): Promise<Category[]> {
  if (!isConfigured) return demoCategories
  return unwrap(await supabase.from('categories').select('*').order('sort'))
}

/** Active members for visitors and members; admins also get inactive ones. */
export async function listMembers(): Promise<Member[]> {
  if (!isConfigured) return demoMembers
  return unwrap(await supabase.from('members').select('*').order('member_number'))
}

export async function getMemberByNumber(n: number): Promise<Member | null> {
  if (!isConfigured) return demoMembers.find((m) => m.member_number === n) ?? null
  return unwrap(await supabase.from('members').select('*').eq('member_number', n).maybeSingle())
}

export type JoinInput = { business_name: string; contact_name: string; category_text: string; email: string; phone: string; reason: string }
export async function submitJoinRequest(input: JoinInput) {
  const row = { ...input, phone: input.phone || null, reason: input.reason || null, category_text: input.category_text || null }
  unwrap(await supabase.from('join_requests').insert(row))
}

// ---- Member ----
export type ProfilePatch = Partial<
  Pick<Member, 'full_name' | 'full_name_fa' | 'business_name' | 'business_name_fa' | 'category_id' | 'bio_en' | 'bio_fa' | 'logo_url' | 'public_email' | 'phone' | 'website'>
>
export async function updateProfile(memberId: string, patch: ProfilePatch) {
  unwrap(await supabase.from('members').update(patch).eq('id', memberId))
}

export type ReferralInput = { sender_id: string; receiver_id: string; client_first_name: string; client_contact: string; need: string; notes: string; consent_confirmed: boolean }
export async function sendReferral(input: ReferralInput) {
  unwrap(await supabase.from('referrals').insert({ ...input, notes: input.notes || null }))
}

const REFERRAL_SELECT = `*, sender:members!referrals_sender_id_fkey(${MEMBER_REF_COLUMNS}), receiver:members!referrals_receiver_id_fkey(${MEMBER_REF_COLUMNS})`

/** Members get the referrals they sent or received; admins get all of them. */
export async function listReferrals(): Promise<ReferralWithMembers[]> {
  return unwrap(await supabase.from('referrals').select(REFERRAL_SELECT).order('created_at', { ascending: false }))
}

export async function setReferralStatus(id: string, status: ReferralStatus, dealValue: number | null = null) {
  unwrap(await supabase.rpc('set_referral_status', { p_referral_id: id, p_status: status, p_deal_value: dealValue }))
}

export async function myStats(): Promise<MyStats> {
  return unwrap(await supabase.rpc('my_stats'))
}

export async function listUnreadNotifications(): Promise<Notification[]> {
  return unwrap(await supabase.from('notifications').select('*').is('read_at', null).order('created_at', { ascending: false }).limit(20))
}

export async function markNotificationRead(id: number) {
  unwrap(await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id))
}

// ---- Admin ----
export async function monthReport(month: string): Promise<MonthReport> {
  return unwrap(await supabase.rpc('admin_month_report', { p_month: month }))
}

export async function redactReferral(id: string) {
  unwrap(await supabase.rpc('redact_referral_client', { p_referral_id: id }))
}

export async function deleteReferral(id: string) {
  unwrap(await supabase.from('referrals').delete().eq('id', id))
}

export type AccountRow = { account_id: string; member_id: string | null; login_email: string; role: Role; last_sign_in_at: string | null }
export async function listAccounts(): Promise<AccountRow[]> {
  return unwrap(await supabase.rpc('admin_list_accounts'))
}

export type SaveMemberInput = {
  member_id: string | null
  member_number: number | null
  full_name: string
  business_name: string
  category_id: number | null
  login_email: string
  role: Role
  status: 'active' | 'inactive'
}
export async function saveMember(input: SaveMemberInput) {
  unwrap(
    await supabase.rpc('admin_save_member', {
      p_member_id: input.member_id,
      p_member_number: input.member_number,
      p_full_name: input.full_name,
      p_business_name: input.business_name,
      p_category_id: input.category_id,
      p_login_email: input.login_email,
      p_role: input.role,
      p_status: input.status,
    }),
  )
}

export async function listJoinRequests(): Promise<JoinRequest[]> {
  return unwrap(await supabase.from('join_requests').select('*').order('created_at', { ascending: false }))
}

export async function approveJoinRequest(id: string, memberNumber: number | null, categoryId: number) {
  unwrap(await supabase.rpc('approve_join_request', { p_request_id: id, p_member_number: memberNumber, p_category_id: categoryId }))
}

export async function rejectJoinRequest(id: string) {
  unwrap(await supabase.rpc('reject_join_request', { p_request_id: id }))
}

export async function deleteJoinRequest(id: string) {
  unwrap(await supabase.from('join_requests').delete().eq('id', id))
}

// ---- Member survey ----
export type SurveyInput = {
  member_number: number | null
  time_sink: string
  repeat_questions: string
  lost_client: string
  ai_tools: string
  ai_use: string
  one_wish: string
  ok_to_chat: boolean
  lang: 'en' | 'fa'
}
/** Saves one answer sheet. Without a database (preview) it does nothing, and the page says so. */
export async function submitSurvey(input: SurveyInput) {
  if (!isConfigured) return
  const blank = (v: string) => v.trim() || null
  unwrap(
    await supabase.from('survey_responses').insert({
      ...input,
      time_sink: input.time_sink.trim(),
      repeat_questions: blank(input.repeat_questions),
      lost_client: blank(input.lost_client),
      ai_tools: blank(input.ai_tools),
      ai_use: blank(input.ai_use),
      one_wish: blank(input.one_wish),
    }),
  )
}

export async function listSurveyResponses(): Promise<SurveyResponse[]> {
  return unwrap(await supabase.from('survey_responses').select('*').order('created_at', { ascending: false }))
}

export async function deleteSurveyResponse(id: string) {
  unwrap(await supabase.from('survey_responses').delete().eq('id', id))
}
