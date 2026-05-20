-- ============================================================
-- PsiApp - Policy: paciente pode deletar próprio agendamento
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

CREATE POLICY "Paciente deleta próprio agendamento"
  ON appointments FOR DELETE
  USING (auth.uid() = patient_id);
