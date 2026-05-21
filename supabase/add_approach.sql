-- ============================================================
-- PsiApp - Migração: abordagem terapêutica do psicólogo
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

ALTER TABLE psychologists
  ADD COLUMN IF NOT EXISTS approach TEXT
  CHECK (approach IN (
    'humanistic',
    'cognitive_behavioral',
    'psychoanalysis',
    'gestalt',
    'systemic',
    'act',
    'dbt'
  ));

-- Política de UPDATE que estava faltando (necessária para salvar a abordagem)
DROP POLICY IF EXISTS "Psicólogo atualiza próprios dados" ON psychologists;
CREATE POLICY "Psicólogo atualiza próprios dados"
  ON psychologists FOR UPDATE
  USING (auth.uid() = id);
