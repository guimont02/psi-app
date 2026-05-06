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
