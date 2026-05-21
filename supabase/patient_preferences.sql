-- ============================================================
-- PsiApp - Preferências do paciente + função de match
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- 1) Colunas de preferência em patients
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS preferred_focus_area TEXT
    CHECK (preferred_focus_area IN ('children','marriage','professional_life','family_life','depression')),
  ADD COLUMN IF NOT EXISTS preferred_approaches TEXT[],
  ADD COLUMN IF NOT EXISTS experience_preference TEXT
    CHECK (experience_preference IN ('experienced','any','early_career'));

-- 2) Policy de UPDATE em patients (para salvar preferências)
DROP POLICY IF EXISTS "Paciente atualiza próprios dados" ON patients;
CREATE POLICY "Paciente atualiza próprios dados"
  ON patients FOR UPDATE
  USING (auth.uid() = id);

-- 3) Função de match: retorna top 3 psicólogos com score
-- Fórmula:
--   focus_score:    100 se psy.focus_area = paciente.preferred_focus_area, senão 0
--   approach_score: 50  se psy.approach ∈ paciente.preferred_approaches, senão 0
--   exp_score:
--     'experienced'   → LEAST(years,20) * 2.5   (max 50)
--     'any'           → LEAST(years,20) * 1     (max 20)
--     'early_career'  → GREATEST(0, 20-years) * 2.5  (max 50)
-- Desempate: years_of_experience DESC (ou ASC se early_career), depois created_at ASC
CREATE OR REPLACE FUNCTION match_psychologists(patient_uuid UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  crp_number TEXT,
  years_of_experience INTEGER,
  focus_area TEXT,
  approach TEXT,
  score NUMERIC,
  focus_match BOOLEAN,
  approach_match BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pref_focus TEXT;
  pref_approaches TEXT[];
  pref_experience TEXT;
BEGIN
  SELECT preferred_focus_area, preferred_approaches, experience_preference
    INTO pref_focus, pref_approaches, pref_experience
    FROM patients
   WHERE patients.id = patient_uuid;

  IF pref_focus IS NULL THEN
    RAISE EXCEPTION 'Paciente ainda não respondeu o quiz de preferências';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    pr.full_name,
    p.crp_number,
    p.years_of_experience,
    p.focus_area,
    p.approach,
    (
      (CASE WHEN p.focus_area = pref_focus THEN 100 ELSE 0 END)
      + (CASE WHEN p.approach = ANY(pref_approaches) THEN 50 ELSE 0 END)
      + (CASE
           WHEN pref_experience = 'experienced'  THEN LEAST(p.years_of_experience, 20) * 2.5
           WHEN pref_experience = 'early_career' THEN GREATEST(0, 20 - p.years_of_experience) * 2.5
           ELSE                                       LEAST(p.years_of_experience, 20) * 1.0
         END)
    )::NUMERIC AS score,
    (p.focus_area = pref_focus) AS focus_match,
    (p.approach = ANY(pref_approaches)) AS approach_match
  FROM psychologists p
  JOIN profiles pr ON pr.id = p.id
  ORDER BY
    score DESC,
    CASE WHEN pref_experience = 'early_career'
         THEN p.years_of_experience
         ELSE -p.years_of_experience
    END,
    pr.full_name ASC
  LIMIT 3;
END;
$$;

-- 4) Permitir paciente autenticado chamar a função
GRANT EXECUTE ON FUNCTION match_psychologists(UUID) TO authenticated;
