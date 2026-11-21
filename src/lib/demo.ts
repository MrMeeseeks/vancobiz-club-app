import type { Category, Member } from './types'

// Shown in the public directory ONLY while the app is not connected to Supabase
// (no VITE_SUPABASE_URL). It mirrors supabase/seed.sql so the site isn't empty before setup.
const rows: [number, string, string, string, string, string][] = [
  [1, 'Amin Sadeghi', 'Be creative not repetitive', 'creative', 'Creative & Club Founder', 'خلاقیت و بنیان‌گذار باشگاه'],
  [2, 'Pedram Kanit', 'Content Creation', 'content', 'Content Creation', 'تولید محتوا'],
  [3, 'Ramin Amoukhteh', 'Business Consultancy', 'consulting', 'Business Consulting', 'مشاوره کسب‌وکار'],
  [4, 'Negar Almasian', 'Home Care Services', 'home-care', 'Home Care', 'مراقبت در منزل'],
  [5, 'Navid Hakimi', 'Residential & Commercial Real Estate', 'real-estate', 'Real Estate', 'املاک'],
  [6, 'Salar Eskandari', 'Immigration Services', 'immigration', 'Immigration', 'مهاجرت'],
  [7, 'Alireza Farzadi', 'Print & Branding Materials', 'print-branding', 'Print & Branding', 'چاپ و برندینگ'],
  [8, 'Sia Ghaem', 'Mortgage Consultancy', 'mortgage', 'Mortgage', 'وام مسکن'],
  [9, 'Vaniya Zokaei', 'Automotive Sales, Economy Cars', 'automotive', 'Automotive', 'خودرو'],
  [10, 'Armin Mavaddat', 'Automotive Sales, Premium Cars', 'automotive', 'Automotive', 'خودرو'],
  [11, 'Zohreh Parsaeian', 'Gold and Jewelry', 'jewelry', 'Gold & Jewelry', 'طلا و جواهر'],
  [12, 'Setareh Ghorbani', 'Italian Restaurant', 'restaurant', 'Restaurant', 'رستوران'],
  [13, 'Sajad Jazini', 'Pollination Services', 'pollination', 'Pollination Services', 'خدمات گرده‌افشانی'],
  [14, 'Mohammad Reza Langary', 'Kitchen and Cabinetry Design', 'kitchen-cabinet', 'Kitchen & Cabinetry', 'آشپزخانه و کابینت'],
  [15, 'Ali Safaee', 'Dentist', 'dental', 'Dental', 'دندان‌پزشکی'],
  [16, 'Nima Asdaghi', 'Web Design', 'web-design', 'Web Design', 'طراحی وب'],
  [17, 'Malika Pakdel', 'Florist', 'florist', 'Florist', 'گل‌فروشی'],
]

export const demoCategories: Category[] = []
for (const [, , , slug, name_en, name_fa] of rows) {
  if (!demoCategories.some((c) => c.slug === slug)) {
    demoCategories.push({ id: demoCategories.length + 1, slug, name_en, name_fa, sort: (demoCategories.length + 1) * 10 })
  }
}

export const demoMembers: Member[] = rows.map(([n, full_name, business_name, slug]) => ({
  id: `demo-${n}`,
  member_number: n,
  full_name,
  full_name_fa: null,
  business_name,
  business_name_fa: null,
  category_id: demoCategories.find((c) => c.slug === slug)!.id,
  bio_en: null,
  bio_fa: null,
  logo_url: null,
  public_email: null,
  phone: null,
  website: null,
  status: 'active',
  created_at: '',
  updated_at: '',
}))
