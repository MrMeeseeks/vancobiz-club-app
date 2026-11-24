// Row shapes for the Supabase tables. See docs/DATA_MODEL.md.

export type Role = 'member' | 'admin'
export type MemberStatus = 'active' | 'inactive'
export type ReferralStatus = 'pending' | 'accepted' | 'declined' | 'contacted' | 'won' | 'lost'
export type JoinStatus = 'new' | 'approved' | 'rejected'

export type Category = {
  id: number
  slug: string
  name_en: string
  name_fa: string
  sort: number
}

export type Member = {
  id: string
  member_number: number
  full_name: string
  full_name_fa: string | null
  business_name: string
  business_name_fa: string | null
  category_id: number | null
  bio_en: string | null
  bio_fa: string | null
  logo_url: string | null
  public_email: string | null
  phone: string | null
  website: string | null
  status: MemberStatus
  created_at: string
  updated_at: string
}

export type MemberRef = Pick<Member, 'id' | 'member_number' | 'full_name' | 'full_name_fa' | 'business_name' | 'business_name_fa' | 'category_id'>

export type Referral = {
  id: string
  sender_id: string
  receiver_id: string
  client_first_name: string
  client_contact: string
  need: string
  notes: string | null
  consent_confirmed: boolean
  consent_at: string
  status: ReferralStatus
  deal_value_cad: number | null
  created_at: string
  updated_at: string
  responded_at: string | null
  closed_at: string | null
  client_redacted_at: string | null
}

export type ReferralWithMembers = Referral & { sender: MemberRef | null; receiver: MemberRef | null }

export type Notification = {
  id: number
  member_id: string
  kind: 'referral_received' | 'referral_won'
  referral_id: string | null
  read_at: string | null
  created_at: string
}

export type JoinRequest = {
  id: string
  business_name: string
  contact_name: string
  category_text: string | null
  email: string
  phone: string | null
  reason: string | null
  status: JoinStatus
  created_at: string
  reviewed_at: string | null
}

export type MyStats = {
  sent: number
  received: number
  won_received: number
  value_received: number
  sent_won: number
  value_generated: number
}

export type MonthReport = {
  month: string
  total: number
  accepted: number
  won: number
  lost: number
  declined: number
  pending: number
  won_value: number
  all_time_total: number
  all_time_won_value: number
  top_referrers: { member_id: string; full_name: string; full_name_fa: string | null; business_name: string; sent: number; won: number; value: number }[]
  flow: { from_category_id: number | null; to_category_id: number | null; count: number; won: number; value: number }[]
}

export const MEMBER_REF_COLUMNS = 'id,member_number,full_name,full_name_fa,business_name,business_name_fa,category_id'

export type SurveyResponse = {
  id: string
  member_number: number | null
  time_sink: string
  repeat_questions: string | null
  lost_client: string | null
  ai_tools: string | null
  ai_use: string | null
  one_wish: string | null
  ok_to_chat: boolean
  lang: 'en' | 'fa'
  created_at: string
}
