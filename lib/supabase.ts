import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type UserRole = 'patient' | 'psychologist';

export type FocusArea =
  | 'children'
  | 'marriage'
  | 'professional_life'
  | 'family_life'
  | 'depression';

export const focusAreaLabels: Record<FocusArea, string> = {
  children: 'Crianças',
  marriage: 'Casamento',
  professional_life: 'Vida Profissional',
  family_life: 'Vida Familiar',
  depression: 'Depressão',
};

export type Approach =
  | 'humanistic'
  | 'cognitive_behavioral'
  | 'psychoanalysis'
  | 'gestalt'
  | 'systemic'
  | 'act'
  | 'dbt';

export const approachLabels: Record<Approach, string> = {
  humanistic:           'Humanista',
  cognitive_behavioral: 'TCC',
  psychoanalysis:       'Psicanálise',
  gestalt:              'Gestalt',
  systemic:             'Sistêmica',
  act:                  'ACT',
  dbt:                  'DBT',
};

// ============================================================
// Quiz de match (preferências do paciente)
// ============================================================

export type ExperiencePreference = 'experienced' | 'any' | 'early_career';

export const experiencePreferenceLabels: Record<ExperiencePreference, string> = {
  experienced:   'Prefiro alguém mais experiente',
  any:           'Tanto faz, vou pelo perfil',
  early_career:  'Prefiro alguém em início de carreira',
};

// Cada opção de "estilo de terapia" mapeia para um conjunto de approaches compatíveis.
export type ApproachQuizOption = {
  key: string;
  label: string;
  approaches: Approach[];
};

export const approachQuizOptions: ApproachQuizOption[] = [
  {
    key: 'practical',
    label: 'Quero ferramentas práticas para o dia a dia',
    approaches: ['cognitive_behavioral', 'dbt', 'act'],
  },
  {
    key: 'deep',
    label: 'Quero entender as raízes profundas dos meus padrões',
    approaches: ['psychoanalysis'],
  },
  {
    key: 'open',
    label: 'Quero um espaço de escuta e autodescoberta no meu ritmo',
    approaches: ['humanistic', 'gestalt'],
  },
  {
    key: 'relational',
    label: 'Quero foco em como me relaciono com outras pessoas',
    approaches: ['systemic'],
  },
  {
    key: 'any',
    label: 'Tanto faz, estou aberto(a) a qualquer abordagem',
    approaches: ['humanistic', 'cognitive_behavioral', 'psychoanalysis', 'gestalt', 'systemic', 'act', 'dbt'],
  },
];

export type MatchedPsychologist = {
  id: string;
  full_name: string;
  crp_number: string;
  years_of_experience: number;
  focus_area: FocusArea;
  approach: Approach | null;
  score: number;
  focus_match: boolean;
  approach_match: boolean;
};

export function matchStrength(score: number): 'strong' | 'medium' | 'partial' {
  if (score >= 150) return 'strong';
  if (score >= 80) return 'medium';
  return 'partial';
}

export const matchStrengthLabels: Record<'strong' | 'medium' | 'partial', string> = {
  strong:  'Match forte',
  medium:  'Match médio',
  partial: 'Match parcial',
};
