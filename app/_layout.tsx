import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../lib/supabase';
import { AuthProvider } from '../context/auth';
import { RegistrationProvider } from '../context/registration';

function NavigationController() {
  const router = useRouter();

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && session) router.replace('/(home)');
      else if (event === 'SIGNED_IN') router.replace('/(home)');
      else if (event === 'SIGNED_OUT') router.replace('/');
    });
    return () => listener.subscription.unsubscribe();
  }, []);

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
