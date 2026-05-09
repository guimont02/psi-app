-- ============================================================
-- PsiApp - Agendamento: slots semanais e appointments
-- Cole este SQL no Supabase: SQL Editor > New query
-- ============================================================

-- Slots de disponibilidade semanal recorrente
CREATE TABLE IF NOT EXISTS availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=dom, 1=seg ... 6=sab
  start_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (psychologist_id, day_of_week, start_time)
);

-- Agendamentos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  psychologist_id UUID REFERENCES psychologists(id) ON DELETE CASCADE NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE NOT NULL,
  slot_id UUID REFERENCES availability_slots(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (psychologist_id, date, start_time)
);

-- RLS
ALTER TABLE availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado lê slots (para pacientes verem disponibilidade)
CREATE POLICY "Leitura pública de slots"
  ON availability_slots FOR SELECT
  USING (true);

-- Psicólogo gerencia seus próprios slots
CREATE POLICY "Psicólogo insere próprios slots"
  ON availability_slots FOR INSERT
  WITH CHECK (auth.uid() = psychologist_id);

CREATE POLICY "Psicólogo deleta próprios slots"
  ON availability_slots FOR DELETE
  USING (auth.uid() = psychologist_id);

-- Paciente agenda
CREATE POLICY "Paciente cria agendamento"
  ON appointments FOR INSERT
  WITH CHECK (auth.uid() = patient_id);

-- Psicólogo e paciente leem seus próprios agendamentos
CREATE POLICY "Usuário vê seus agendamentos"
  ON appointments FOR SELECT
  USING (auth.uid() = patient_id OR auth.uid() = psychologist_id);

-- Paciente pode cancelar seu agendamento
CREATE POLICY "Paciente cancela agendamento"
  ON appointments FOR UPDATE
  USING (auth.uid() = patient_id);
