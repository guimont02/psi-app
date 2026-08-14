-- ============================================================
-- PsiApp - Separa a nota clínica (privada) da devolutiva (paciente)
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- 1) session_notes passa a ser exclusiva do psicólogo.
-- O RLS do Postgres é por linha, não por coluna: enquanto o paciente
-- puder ler a linha, ele lê todos os campos. Por isso a devolutiva vive
-- em outra tabela, e não numa coluna extra aqui.
DROP POLICY IF EXISTS "Paciente lê próprias notas" ON session_notes;

-- 2) Devolutiva: o texto escrito PARA o paciente
CREATE TABLE IF NOT EXISTS session_shared_notes (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id  UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  patient_id      UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  content         TEXT NOT NULL,
  -- NULL = rascunho. O psicólogo escreve à vontade e decide quando o
  -- paciente passa a ver; sem isso o texto apareceria meia-frase por vez.
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shared_notes_patient
  ON session_shared_notes(patient_id, published_at);

-- 3) RLS
ALTER TABLE session_shared_notes ENABLE ROW LEVEL SECURITY;

-- Paciente lê apenas as devolutivas dele E apenas depois de publicadas
DROP POLICY IF EXISTS "Paciente lê devolutivas publicadas" ON session_shared_notes;
CREATE POLICY "Paciente lê devolutivas publicadas"
  ON session_shared_notes FOR SELECT
  USING (auth.uid() = patient_id AND published_at IS NOT NULL);

-- Psicólogo lê as próprias devolutivas, publicadas ou não
DROP POLICY IF EXISTS "Psicólogo lê próprias devolutivas" ON session_shared_notes;
CREATE POLICY "Psicólogo lê próprias devolutivas"
  ON session_shared_notes FOR SELECT
  USING (auth.uid() = psychologist_id);

-- Psicólogo cria devolutiva apenas para sessões dele
DROP POLICY IF EXISTS "Psicólogo cria devolutiva da própria sessão" ON session_shared_notes;
CREATE POLICY "Psicólogo cria devolutiva da própria sessão"
  ON session_shared_notes FOR INSERT
  WITH CHECK (
    auth.uid() = psychologist_id
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = session_shared_notes.appointment_id
        AND a.psychologist_id = auth.uid()
        AND a.patient_id = session_shared_notes.patient_id
    )
  );

-- Psicólogo atualiza somente as próprias devolutivas
DROP POLICY IF EXISTS "Psicólogo atualiza própria devolutiva" ON session_shared_notes;
CREATE POLICY "Psicólogo atualiza própria devolutiva"
  ON session_shared_notes FOR UPDATE
  USING (auth.uid() = psychologist_id);

-- 4) updated_at automático (set_updated_at já existe, de session_notes.sql)
DROP TRIGGER IF EXISTS trg_shared_notes_updated_at ON session_shared_notes;
CREATE TRIGGER trg_shared_notes_updated_at
  BEFORE UPDATE ON session_shared_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
