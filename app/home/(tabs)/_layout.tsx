import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { colors, fontSize } from '../../../constants/theme';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/auth';

export default function TabsLayout() {
  const { session } = useAuth();
  const [role, setRole] = useState<'patient' | 'psychologist' | null>(null);

  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => { if (data) setRole(data.role); });
  }, [session]);

  const isPatient = role === 'patient';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textLight,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: fontSize.xs,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="appointments" options={{ title: 'Consultas' }} />
      <Tabs.Screen
        name="notebook"
        options={{
          title: 'Caderno',
          href: isPatient ? '/home/notebook' : null,
        }}
      />
    </Tabs>
  );
}
