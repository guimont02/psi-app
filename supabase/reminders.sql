-- ============================================================
-- PsiApp - Lembretes de consulta (psicólogo -> paciente)
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- 1) Tabela de lembretes
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE NOT NULL,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Índice para buscar lembretes não lidos do paciente
CREATE INDEX IF NOT EXISTS idx_reminders_patient_unread
  ON reminders(patient_id, read_at);

-- 2) RLS
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;

-- Paciente lê apenas os próprios lembretes
DROP POLICY IF EXISTS "Paciente lê próprios lembretes" ON reminders;
CREATE POLICY "Paciente lê próprios lembretes"
  ON reminders FOR SELECT
  USING (auth.uid() = patient_id);

-- Psicólogo lê os lembretes que ele mesmo enviou
DROP POLICY IF EXISTS "Psicólogo lê lembretes que enviou" ON reminders;
CREATE POLICY "Psicólogo lê lembretes que enviou"
  ON reminders FOR SELECT
  USING (auth.uid() = psychologist_id);

-- Psicólogo envia lembrete apenas para consultas dele
DROP POLICY IF EXISTS "Psicólogo envia lembrete da própria consulta" ON reminders;
CREATE POLICY "Psicólogo envia lembrete da própria consulta"
  ON reminders FOR INSERT
  WITH CHECK (
    auth.uid() = psychologist_id
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.id = reminders.appointment_id
        AND a.psychologist_id = auth.uid()
        AND a.patient_id = reminders.patient_id
    )
  );

-- Paciente marca os próprios lembretes como lidos
DROP POLICY IF EXISTS "Paciente marca lembrete como lido" ON reminders;
CREATE POLICY "Paciente marca lembrete como lido"
  ON reminders FOR UPDATE
  USING (auth.uid() = patient_id);

-- 3) Realtime: publica a tabela para o app do paciente receber o INSERT na hora
ALTER PUBLICATION supabase_realtime ADD TABLE reminders;
