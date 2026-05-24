-- ============================================================
-- PsiApp - Transcrição automática da sessão (Recall.ai + Claude)
-- Cole este SQL no Supabase: SQL Editor > New query
--
-- 1 transcrição por agendamento. Escrita feita SOMENTE pelo
-- backend (Edge Functions) via service_role, que ignora a RLS.
-- Por isso não há policies de INSERT/UPDATE para usuários:
-- paciente e psicólogo apenas LEEM.
-- ============================================================

-- 1) Tabela de transcrições
CREATE TABLE IF NOT EXISTS session_transcripts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL UNIQUE,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  transcript TEXT,
  summary TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'recording', 'processing', 'completed', 'failed')),
  recall_bot_id TEXT,
  consent_at TIMESTAMPTZ,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices: leitura por paciente/agendamento e lookup pelo webhook do Recall
CREATE INDEX IF NOT EXISTS idx_session_transcripts_patient_id ON session_transcripts(patient_id);
CREATE INDEX IF NOT EXISTS idx_session_transcripts_appointment_id ON session_transcripts(appointment_id);
CREATE INDEX IF NOT EXISTS idx_session_transcripts_recall_bot_id ON session_transcripts(recall_bot_id);

-- 2) RLS
ALTER TABLE session_transcripts ENABLE ROW LEVEL SECURITY;

-- Paciente lê suas próprias transcrições
DROP POLICY IF EXISTS "Paciente lê próprias transcrições" ON session_transcripts;
CREATE POLICY "Paciente lê próprias transcrições"
  ON session_transcripts FOR SELECT
  USING (auth.uid() = patient_id);

-- Psicólogo lê transcrições de pacientes com quem tem/teve agendamento
DROP POLICY IF EXISTS "Psicólogo lê transcrições dos seus pacientes" ON session_transcripts;
CREATE POLICY "Psicólogo lê transcrições dos seus pacientes"
  ON session_transcripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = session_transcripts.patient_id
        AND a.psychologist_id = auth.uid()
    )
  );

-- Sem policies de INSERT/UPDATE/DELETE: somente o backend (service_role) escreve.

-- 3) Trigger para manter updated_at sempre atualizado
-- (reaproveita a função set_updated_at() criada em session_notes.sql)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_session_transcripts_updated_at ON session_transcripts;
CREATE TRIGGER trg_session_transcripts_updated_at
  BEFORE UPDATE ON session_transcripts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
