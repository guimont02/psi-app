-- ============================================================
-- PsiApp - Caderno do psicólogo (fase 1: manual)
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- 1) Tabela de notas: 1 nota por agendamento (sessão)
CREATE TABLE IF NOT EXISTS session_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índice para listar notas do paciente rapidamente
CREATE INDEX IF NOT EXISTS idx_session_notes_patient_id ON session_notes(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_notes_appointment_id ON session_notes(appointment_id);

-- 2) RLS
ALTER TABLE session_notes ENABLE ROW LEVEL SECURITY;

-- Paciente lê suas próprias notas
DROP POLICY IF EXISTS "Paciente lê próprias notas" ON session_notes;
CREATE POLICY "Paciente lê próprias notas"
  ON session_notes FOR SELECT
  USING (auth.uid() = patient_id);

-- Psicólogo lê notas de qualquer paciente com quem tem/teve agendamento
DROP POLICY IF EXISTS "Psicólogo lê notas dos seus pacientes" ON session_notes;
CREATE POLICY "Psicólogo lê notas dos seus pacientes"
  ON session_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = session_notes.patient_id
        AND a.psychologist_id = auth.uid()
    )
  );

-- Psicólogo cria nota apenas para sessões dele
DROP POLICY IF EXISTS "Psicólogo cria nota da própria sessão" ON session_notes;
CREATE POLICY "Psicólogo cria nota da própria sessão"
  ON session_notes FOR INSERT
  WITH CHECK (
    auth.uid() = psychologist_id
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = session_notes.appointment_id
        AND a.psychologist_id = auth.uid()
        AND a.patient_id = session_notes.patient_id
    )
  );

-- Psicólogo atualiza somente suas próprias notas
DROP POLICY IF EXISTS "Psicólogo atualiza própria nota" ON session_notes;
CREATE POLICY "Psicólogo atualiza própria nota"
  ON session_notes FOR UPDATE
  USING (auth.uid() = psychologist_id);

-- 3) Trigger para manter updated_at sempre atualizado
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_notes_updated_at ON session_notes;
CREATE TRIGGER trg_session_notes_updated_at
  BEFORE UPDATE ON session_notes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
