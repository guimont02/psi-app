-- ============================================================
-- PsiApp - Supabase Schema
-- Cole este SQL no editor do Supabase (SQL Editor > New query)
-- ============================================================

-- Tabela de perfis (extende auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('patient', 'psychologist')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de psicólogos
CREATE TABLE IF NOT EXISTS psychologists (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  crp_number TEXT NOT NULL UNIQUE,
  cpf TEXT NOT NULL UNIQUE,
  years_of_experience INTEGER NOT NULL,
  focus_area TEXT NOT NULL CHECK (
    focus_area IN ('children', 'marriage', 'professional_life', 'family_life', 'depression')
  )
);

-- Tabela de pacientes
CREATE TABLE IF NOT EXISTS patients (
  id UUID REFERENCES profiles(id) ON DELETE CASCADE PRIMARY KEY,
  birth_date DATE NOT NULL
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE psychologists ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Usuário lê próprio perfil"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Usuário insere próprio perfil"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Usuário atualiza próprio perfil"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Políticas para psychologists
CREATE POLICY "Psicólogo lê próprios dados"
  ON psychologists FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Psicólogo insere próprios dados"
  ON psychologists FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Políticas para patients
CREATE POLICY "Paciente lê próprios dados"
  ON patients FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Paciente insere próprios dados"
  ON patients FOR INSERT
  WITH CHECK (auth.uid() = id);
