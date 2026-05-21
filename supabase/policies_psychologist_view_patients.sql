-- ============================================================
-- PsiApp - Políticas: psicólogo vê dados dos seus pacientes
-- Cole este SQL no Supabase: SQL Editor > New query
--
-- Sem essas policies, o join appointments → patients → profiles
-- retorna null pro psicólogo (RLS esconde tudo), quebrando a aba Consultas.
-- ============================================================

-- Psicólogo lê perfil de pacientes com quem tem/teve agendamento
DROP POLICY IF EXISTS "Psicólogo lê perfil dos seus pacientes" ON profiles;
CREATE POLICY "Psicólogo lê perfil dos seus pacientes"
  ON profiles FOR SELECT
  USING (
    role = 'patient'
    AND EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = profiles.id
        AND a.psychologist_id = auth.uid()
    )
  );

-- Psicólogo lê dados em patients de quem tem/teve agendamento
DROP POLICY IF EXISTS "Psicólogo lê dados dos seus pacientes" ON patients;
CREATE POLICY "Psicólogo lê dados dos seus pacientes"
  ON patients FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM appointments a
      WHERE a.patient_id = patients.id
        AND a.psychologist_id = auth.uid()
    )
  );
