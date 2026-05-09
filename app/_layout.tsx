import { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../context/auth';
import { RegistrationProvider } from '../context/registration';
import { Session } from '@supabase/supabase-js';

function NavigationController() {
  const { session, initialized } = useAuth();
  const router = useRouter();
  const prevSession = useRef<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!initialized) return;

    const prev = prevSession.current;
    prevSession.current = session;

    // Carga inicial
    if (prev === undefined) {
      if (session) router.replace('/home');
      return;
    }

    // Login
    if (session && !prev) {
      router.replace('/home');
      return;
    }

    // Logout
    if (!session && prev) {
      router.replace('/');
    }
  }, [session, initialized]);

  return null;
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RegistrationProvider>
        <StatusBar style="auto" />
        <NavigationController />
        <Stack screenOptions={{ headerShown: false }} />
      </RegistrationProvider>
    </AuthProvider>
  );
}
