// Voice-interview prototype: the per-member question and the shape of the profile the agent saves.
// The agent's script lives in scripts/voice-agent/prompt.md; the tool schema in save-profile-tool.json.

/** One design-changing question per member number (English, Farsi). */
export const EXTRA_QUESTIONS: Record<number, { en: string; fa: string }> = {
  1: { en: 'Would Vancobiz set up and maintain this tool for other members as a paid service, and on what terms?', fa: 'آیا Vancobiz حاضر است راه‌اندازی و نگهداری این ابزار را برای اعضای دیگر به‌صورت خدمت پولی انجام دهد؟ با چه شرایطی؟' },
  2: { en: 'Do you work inside Vancobiz, or do you run a separate content business with your own clients?', fa: 'داخل Vancobiz کار می‌کنید یا کسب‌وکار محتوای جداگانه با مشتری‌های خودتان دارید؟' },
  3: { en: "What is your firm's name, who is your typical client, and what do you deliver to them?", fa: 'نام شرکت شما چیست، مشتری معمول شما کیست و چه چیزی به او تحویل می‌دهید؟' },
  4: { en: 'How many caregivers do you have, do you employ nurses or hold health-authority contracts, and how do you schedule shifts today?', fa: 'چند مراقب دارید، آیا پرستار یا قرارداد با اداره سلامت دارید، و شیفت‌ها را الان چطور برنامه‌ریزی می‌کنید؟' },
  5: { en: 'Which system routes leads across your team, and does your brokerage restrict how you use AI?', fa: 'سرنخ‌ها با چه سیستمی بین اعضای تیم تقسیم می‌شود، و آیا بروکریج شما استفاده از هوش مصنوعی را محدود کرده است؟' },
  6: { en: 'What is your licence class and number, and which software holds your client files?', fa: 'نوع و شماره مجوز شما چیست و پرونده مشتری‌ها در چه نرم‌افزاری نگهداری می‌شود؟' },
  7: { en: 'How does your pricing work across products, and how do clients approve orders and proofs now?', fa: 'قیمت‌گذاری محصولات شما چطور است، و مشتری‌ها الان سفارش و نمونه چاپ را چطور تأیید می‌کنند؟' },
  8: { en: 'Which languages do you serve clients in, and what does your application portal not do for you?', fa: 'به چه زبان‌هایی به مشتری خدمات می‌دهید، و پورتال درخواست شما چه کاری را برایتان انجام نمی‌دهد؟' },
  9: { en: "Are you an employee or the dealer, and what is the dealership's policy on AI and on your personal posts?", fa: 'کارمند هستید یا صاحب نمایندگی؟ سیاست نمایندگی درباره هوش مصنوعی و پست‌های شخصی شما چیست؟' },
  10: { en: 'Are you an employee or the dealer, and what do the dealership and the brand allow in your personal advertising?', fa: 'کارمند هستید یا صاحب نمایندگی؟ نمایندگی و برند در تبلیغات شخصی شما چه چیزی را اجازه می‌دهند؟' },
  11: { en: 'How do you set the daily gold rate, and how does your making fee work for each type of piece?', fa: 'نرخ روزانه طلا را چطور تعیین می‌کنید، و اجرت ساخت برای هر نوع کار چطور حساب می‌شود؟' },
  12: { en: 'Who answers the phone during service, and do you have a verified allergen table for the menu?', fa: 'هنگام سرویس چه کسی تلفن را جواب می‌دهد، و آیا جدول تأییدشده مواد حساسیت‌زا برای منو دارید؟' },
  13: { en: 'What exactly is your service: renting hives to growers, or something else? Who are your customers?', fa: 'خدمت شما دقیقاً چیست: اجاره کندو به کشاورزان یا چیز دیگری؟ مشتری‌های شما چه کسانی هستند؟' },
  14: { en: 'How do you put a quote together, and how do clients approve changes after work has started?', fa: 'پیش‌فاکتور را چطور آماده می‌کنید، و مشتری‌ها تغییرات را بعد از شروع کار چطور تأیید می‌کنند؟' },
  15: { en: 'Do you own the practice or work as an associate, and do you accept the Canadian Dental Care Plan?', fa: 'صاحب مطب هستید یا همکار؟ آیا طرح دندان‌پزشکی کانادا را می‌پذیرید؟' },
  16: { en: 'How long does it usually take clients to send you their content, and would you maintain the club tool for a fee?', fa: 'معمولاً چقدر طول می‌کشد تا مشتری محتوایش را بفرستد؟ آیا حاضرید نگهداری ابزار باشگاه را در ازای دستمزد انجام دهید؟' },
  17: { en: 'What are your order deadlines on peak days, your delivery zones, and your substitution policy?', fa: 'مهلت سفارش در روزهای شلوغ، محدوده‌های تحویل و سیاست جایگزینی گل شما چیست؟' },
}

export const DEFAULT_EXTRA = {
  en: 'What should we know about your business that we have not asked?',
  fa: 'چه چیزی درباره کسب‌وکار شما هست که نپرسیدیم و باید بدانیم؟',
}

/** What the agent sends to the browser through the save_business_profile client tool. */
export type BusinessProfileDraft = {
  business_name?: string
  online_presence?: string
  services?: string
  not_offered?: string
  pricing?: string
  faqs?: { question: string; answer: string }[]
  channels?: string
  current_tools?: string
  tone?: string
  rules?: string
  member_specific_answer?: string
  biggest_time_sink?: string
  one_thing?: string
  interview_language?: string
  interviewer_notes?: string
}

/** Text fields in display order; labels come from the "voice.field.*" translations. */
export const PROFILE_TEXT_FIELDS = [
  'business_name',
  'online_presence',
  'services',
  'not_offered',
  'pricing',
  'channels',
  'current_tools',
  'tone',
  'rules',
  'member_specific_answer',
  'biggest_time_sink',
  'one_thing',
  'interviewer_notes',
] as const
