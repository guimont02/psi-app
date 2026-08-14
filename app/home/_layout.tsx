import { useEffect } from 'react';
import { Alert } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/auth';

type Reminder = { id: string; message: string };

function showReminders(reminders: Reminder[]) {
  if (reminders.length === 0) return;
  const title = reminders.length > 1 ? `${reminders.length} lembretes` : 'Lembrete da consulta';
  Alert.alert(title, reminders.map((r) => r.message).join('\n\n'), [{ text: 'Ok' }]);
  supabase
    .from('reminders')
    .update({ read_at: new Date().toISOString() })
    .in('id', reminders.map((r) => r.id))
    .then(() => {});
}

// Paciente recebe os lembretes do psicólogo como pop-up enquanto o app está aberto.
// Os que chegaram com o app fechado aparecem na próxima abertura.
function useReminderPopups() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return;
    const patientId = session.user.id;

    supabase
      .from('reminders')
      .select('id, message')
      .eq('patient_id', patientId)
      .is('read_at', null)
      .order('created_at', { ascending: true })
      .then(({ data }) => showReminders(data ?? []));

    const channel = supabase
      .channel(`reminders:${patientId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'reminders',
          filter: `patient_id=eq.${patientId}`,
        },
        ({ new: reminder }) => showReminders([reminder as Reminder])
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);
}

export default function HomeLayout() {
  useReminderPopups();
  return <Stack screenOptions={{ headerShown: false }} />;
}
