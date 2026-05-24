// ============================================================
// PsiApp - Edge Function: start-transcription
// Dispara o bot do Recall.ai para entrar na sala do Meet e
// transcrever. Cria/atualiza a row em session_transcripts.
//
// Secrets necessários:
//   RECALL_API_KEY
//   RECALL_REGION        (ex: us-west-2, us-east-1, eu-central-1)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente)
//
// O webhook transcript.done é configurado no dashboard do Recall
// apontando para a Edge Function recall-webhook.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { appointmentId } = await req.json();
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'appointmentId é obrigatório' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('id, meet_link, psychologist_id, patient_id')
      .eq('id', appointmentId)
      .single();

    if (apptErr || !appt) {
      return new Response(JSON.stringify({ error: 'Consulta não encontrada' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    if (!appt.meet_link) {
      return new Response(JSON.stringify({ error: 'Consulta sem link de videochamada' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const region = Deno.env.get('RECALL_REGION');
    const recallRes = await fetch(`https://${region}.recall.ai/api/v1/bot/`, {
      method: 'POST',
      headers: {
        // Confirme o formato do header com sua conta: alguns usam "Token <key>".
        Authorization: `Token ${Deno.env.get('RECALL_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        meeting_url: appt.meet_link,
        bot_name: 'Assistente de transcrição (PsiApp)',
        recording_config: {
          transcript: {
            provider: {
              recallai_streaming: { language_code: 'pt' },
            },
            diarization: { use_separate_streams_when_available: true },
          },
        },
      }),
    });

    if (!recallRes.ok) {
      throw new Error(`Recall bot create falhou: ${await recallRes.text()}`);
    }
    const bot = await recallRes.json();

    const { error: upErr } = await supabase.from('session_transcripts').upsert(
      {
        appointment_id: appt.id,
        psychologist_id: appt.psychologist_id,
        patient_id: appt.patient_id,
        status: 'recording',
        recall_bot_id: bot.id,
        consent_at: new Date().toISOString(),
      },
      { onConflict: 'appointment_id' },
    );
    if (upErr) throw new Error(`upsert session_transcripts falhou: ${upErr.message}`);

    return new Response(JSON.stringify({ botId: bot.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
