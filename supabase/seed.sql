-- VancoBiz Club: seed data. Run once, after the migrations.
-- Login emails are PLACEHOLDERS (member01@example.com ...). Replace them before inviting anyone:
-- see "Replace the placeholder emails" in SETUP_CHECKLIST.md. No email is ever sent to @example.com.
-- business_name starts as each member's line of work; members can set their real business
-- name, Farsi name, bio and contact details on their profile page.

insert into public.categories (slug, name_en, name_fa, sort) values
  ('creative',        'Creative & Club Founder',  'خلاقیت و بنیان‌گذار باشگاه', 10),
  ('content',         'Content Creation',         'تولید محتوا',               20),
  ('consulting',      'Business Consulting',      'مشاوره کسب‌وکار',            30),
  ('home-care',       'Home Care',                'مراقبت در منزل',            40),
  ('real-estate',     'Real Estate',              'املاک',                     50),
  ('immigration',     'Immigration',              'مهاجرت',                    60),
  ('print-branding',  'Print & Branding',         'چاپ و برندینگ',             70),
  ('mortgage',        'Mortgage',                 'وام مسکن',                  80),
  ('automotive',      'Automotive',               'خودرو',                     90),
  ('jewelry',         'Gold & Jewelry',           'طلا و جواهر',               100),
  ('restaurant',      'Restaurant',               'رستوران',                   110),
  ('pollination',     'Pollination Services',     'خدمات گرده‌افشانی',          120),
  ('kitchen-cabinet', 'Kitchen & Cabinetry',      'آشپزخانه و کابینت',          130),
  ('dental',          'Dental',                   'دندان‌پزشکی',                140),
  ('web-design',      'Web Design',               'طراحی وب',                  150),
  ('florist',         'Florist',                  'گل‌فروشی',                   160);

with seed (member_number, full_name, business_name, category_slug, role) as (values
  (1,  'Amin Sadeghi',          'Be creative not repetitive',              'creative',        'admin'),
  (2,  'Pedram Kanit',          'Content Creation',                        'content',         'member'),
  (3,  'Ramin Amoukhteh',       'Business Consultancy',                    'consulting',      'member'),
  (4,  'Negar Almasian',        'Home Care Services',                      'home-care',       'member'),
  (5,  'Navid Hakimi',          'Residential & Commercial Real Estate',    'real-estate',     'member'),
  (6,  'Salar Eskandari',       'Immigration Services',                    'immigration',     'member'),
  (7,  'Alireza Farzadi',       'Print & Branding Materials',              'print-branding',  'member'),
  (8,  'Sia Ghaem',             'Mortgage Consultancy',                    'mortgage',        'member'),
  (9,  'Vaniya Zokaei',         'Automotive Sales, Economy Cars',          'automotive',      'member'),
  (10, 'Armin Mavaddat',        'Automotive Sales, Premium Cars',          'automotive',      'member'),
  (11, 'Zohreh Parsaeian',      'Gold and Jewelry',                        'jewelry',         'member'),
  (12, 'Setareh Ghorbani',      'Italian Restaurant',                      'restaurant',      'member'),
  (13, 'Sajad Jazini',          'Pollination Services',                    'pollination',     'member'),
  (14, 'Mohammad Reza Langary', 'Kitchen and Cabinetry Design',            'kitchen-cabinet', 'member'),
  (15, 'Ali Safaee',            'Dentist',                                 'dental',          'member'),
  (16, 'Nima Asdaghi',          'Web Design',                              'web-design',      'member'),
  (17, 'Malika Pakdel',         'Florist',                                 'florist',         'member')
), inserted as (
  insert into public.members (member_number, full_name, business_name, category_id)
  select s.member_number, s.full_name, s.business_name, c.id
  from seed s join public.categories c on c.slug = s.category_slug
  returning id, member_number
)
insert into public.member_accounts (member_id, login_email, role)
select i.id, 'member' || lpad(i.member_number::text, 2, '0') || '@example.com', s.role
from inserted i join seed s on s.member_number = i.member_number;

-- A second admin login that is not a listed member (for Salar, the builder).
insert into public.member_accounts (member_id, login_email, role)
values (null, 'admin@example.com', 'admin');
