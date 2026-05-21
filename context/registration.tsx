import React, { createContext, useContext, useState } from 'react';
import { Approach, FocusArea, UserRole } from '../lib/supabase';

export type PatientRegistrationData = {
  role: 'patient';
  full_name: string;
  birth_date: string;
  email: string;
};

export type PsychologistRegistrationData = {
  role: 'psychologist';
  full_name: string;
  cpf: string;
  email: string;
  crp_number: string;
  years_of_experience: string;
  focus_area: FocusArea;
  approach?: Approach;
};

export type RegistrationData = PatientRegistrationData | PsychologistRegistrationData;

type RegistrationContextType = {
  registrationData: RegistrationData | null;
  setRegistrationData: (data: RegistrationData | null) => void;
};

const RegistrationContext = createContext<RegistrationContextType>({
  registrationData: null,
  setRegistrationData: () => {},
});

export function RegistrationProvider({ children }: { children: React.ReactNode }) {
  const [registrationData, setRegistrationData] = useState<RegistrationData | null>(null);
  return (
    <RegistrationContext.Provider value={{ registrationData, setRegistrationData }}>
      {children}
    </RegistrationContext.Provider>
  );
}

export const useRegistration = () => useContext(RegistrationContext);
