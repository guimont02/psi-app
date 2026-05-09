-- ============================================================
-- PsiApp - Seed: 10 Psicólogos de exemplo
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- Desabilita RLS temporariamente para inserção de seed
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists DISABLE ROW LEVEL SECURITY;

-- Insere usuários fictícios em auth.users
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role, aud
)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'ana.lima@psiapp.com',        crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000002', 'carlos.mendes@psiapp.com',   crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000003', 'julia.ferreira@psiapp.com',  crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000004', 'marcos.oliveira@psiapp.com', crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000005', 'patricia.souza@psiapp.com',  crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000006', 'rafael.costa@psiapp.com',    crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000007', 'camila.rocha@psiapp.com',    crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000008', 'lucas.alves@psiapp.com',     crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000009', 'fernanda.gomes@psiapp.com',  crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated'),
  ('a1000000-0000-0000-0000-000000000010', 'thiago.martins@psiapp.com',  crypt('senha123', gen_salt('bf')), NOW(), NOW(), NOW(), '{"provider":"email","providers":["email"]}', '{}', false, 'authenticated', 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- Insere perfis
INSERT INTO profiles (id, full_name, email, role, created_at)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Ana Lima',           'ana.lima@psiapp.com',        'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000002', 'Carlos Mendes',      'carlos.mendes@psiapp.com',   'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000003', 'Júlia Ferreira',     'julia.ferreira@psiapp.com',  'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000004', 'Marcos Oliveira',    'marcos.oliveira@psiapp.com', 'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000005', 'Patrícia Souza',     'patricia.souza@psiapp.com',  'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000006', 'Rafael Costa',       'rafael.costa@psiapp.com',    'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000007', 'Camila Rocha',       'camila.rocha@psiapp.com',    'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000008', 'Lucas Alves',        'lucas.alves@psiapp.com',     'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000009', 'Fernanda Gomes',     'fernanda.gomes@psiapp.com',  'psychologist', NOW()),
  ('a1000000-0000-0000-0000-000000000010', 'Thiago Martins',     'thiago.martins@psiapp.com',  'psychologist', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insere dados dos psicólogos
-- focus_area: 'children' | 'marriage' | 'professional_life' | 'family_life' | 'depression'
INSERT INTO psychologists (id, crp_number, cpf, years_of_experience, focus_area)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'CRP 06/123456', '111.111.111-01',  8,  'children'),
  ('a1000000-0000-0000-0000-000000000002', 'CRP 06/234567', '222.222.222-02', 15,  'depression'),
  ('a1000000-0000-0000-0000-000000000003', 'CRP 06/345678', '333.333.333-03',  3,  'marriage'),
  ('a1000000-0000-0000-0000-000000000004', 'CRP 06/456789', '444.444.444-04', 20,  'family_life'),
  ('a1000000-0000-0000-0000-000000000005', 'CRP 06/567890', '555.555.555-05', 12,  'professional_life'),
  ('a1000000-0000-0000-0000-000000000006', 'CRP 06/678901', '666.666.666-06',  6,  'depression'),
  ('a1000000-0000-0000-0000-000000000007', 'CRP 06/789012', '777.777.777-07',  1,  'children'),
  ('a1000000-0000-0000-0000-000000000008', 'CRP 06/890123', '888.888.888-08', 25,  'marriage'),
  ('a1000000-0000-0000-0000-000000000009', 'CRP 06/901234', '999.999.999-09',  9,  'family_life'),
  ('a1000000-0000-0000-0000-000000000010', 'CRP 06/012345', '000.000.000-10',  4,  'professional_life')
ON CONFLICT (id) DO NOTHING;

-- Reabilita RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
