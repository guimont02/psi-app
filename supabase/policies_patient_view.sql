-- ============================================================
-- PsiApp - Políticas: pacientes visualizam psicólogos
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- Permite qualquer usuário autenticado ler perfis de psicólogos
CREATE POLICY "Qualquer usuário vê perfis de psicólogos"
  ON profiles FOR SELECT
  USING (role = 'psychologist');

-- Permite qualquer usuário autenticado listar psicólogos
CREATE POLICY "Qualquer usuário lista psicólogos"
  ON psychologists FOR SELECT
  USING (true);
