// ============================================================
// PsiApp - Edge Function: recall-webhook
// Recebe os eventos do Recall.ai (configurados no dashboard do
// Recall apontando para esta URL). Quando a transcrição fica
// pronta, gera um resumo clínico com o Claude e grava em
// session_transcripts.
//
// Secrets necessários:
//   RECALL_API_KEY
//   RECALL_REGION
//   ANTHROPIC_API_KEY
//   RECALL_WEBHOOK_SECRET   (opcional, p/ validar a origem)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente)
//
// IMPORTANTE: deployar com verify_jwt = false — o Recall não manda
// JWT do Supabase. Em produção, valide a assinatura do webhook do
// Recall (Svix) antes de confiar no payload.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

const SUMMARY_SYSTEM = `Você é um assistente clínico que resume sessões de psicoterapia para o psicólogo revisar. Escreva em português do Brasil, de forma objetiva e profissional.

Regras:
- Baseie-se SOMENTE no que está na transcrição. Não invente, não diagnostique, não especule além do dito.
- A transcrição vem com diarização (falantes separados). Use isso para distinguir o que foi dito pelo psicólogo e pelo paciente, mas não exponha rótulos crus de falante no texto final.
- Seja conciso. É um rascunho de apoio, não um prontuário oficial.

Estruture a resposta nestas seções (markdown):
## Resumo geral
## Temas e queixas principais
## Pontos relevantes da sessão
## Possíveis encaminhamentos / próximos passos

Ao final, inclua a linha em itálico: *Resumo gerado por IA a partir da transcrição — revise antes de usar.*`;

async function summarizeTranscript(transcriptText: string): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'medium' },
      // O system prompt é a parte estável → cache_control aqui. (Só
      // cacheia de fato se passar do mínimo ~4096 tokens no Opus 4.7;
      // a transcrição, que varia, vai no turno do usuário, depois do prefixo.)
      system: [
        { type: 'text', text: SUMMARY_SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      messages: [
        {
          role: 'user',
          content: `Transcrição da sessão (com diarização):\n\n${transcriptText}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic falhou: ${await res.text()}`);
  const data = await res.json();
  const textBlock = (data.content ?? []).find(
    (b: { type: string }) => b.type === 'text',
  );
  return textBlock?.text ?? '';
}

// O download_url do transcript.done devolve um JSON de segmentos.
// O formato pode variar por versão da API — este flattener cobre as
// formas comuns ({ speaker/participant, words: [{text}] } | { text }).
function flattenTranscript(payload: unknown): string {
  if (!Array.isArray(payload)) return typeof payload === 'string' ? payload : '';
  return payload
    .map((seg: Record<string, unknown>) => {
      const speaker =
        (seg.speaker as string) ??
        (seg.participant as Record<string, unknown>)?.name ??
        '';
      const words = seg.words as Array<{ text?: string }> | undefined;
      const text = words
        ? words.map((w) => w.text ?? '').join(' ')
        : ((seg.text as string) ?? '');
      return speaker ? `${speaker}: ${text}` : text;
    })
    .filter(Boolean)
    .join('\n');
}

Deno.serve(async (req) => {
  try {
    const event = await req.json();
    const type: string = event.event ?? event.type ?? '';
    const data = event.data ?? {};
    const botId: string | undefined =
      data.bot_id ?? data.bot?.id ?? data.recording?.bot_id;

    if (!botId) return new Response('ok (sem bot_id)', { status: 200 });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    if (type === 'transcript.failed') {
      await supabase
        .from('session_transcripts')
        .update({ status: 'failed' })
        .eq('recall_bot_id', botId);
      return new Response('ok', { status: 200 });
    }

    if (type !== 'transcript.done') {
      // Eventos intermediários (transcript.processing, status do bot, etc.)
      return new Response('ok (ignorado)', { status: 200 });
    }

    await supabase
      .from('session_transcripts')
      .update({ status: 'processing' })
      .eq('recall_bot_id', botId);

    // O webhook traz só o ID do transcrito. Buscamos o objeto na API
    // do Recall para obter o download_url do conteúdo finalizado.
    const transcriptId: string | undefined = data.transcript?.id;
    if (!transcriptId) throw new Error('transcript.done sem transcript.id');

    const region = Deno.env.get('RECALL_REGION');
    const metaRes = await fetch(
      `https://${region}.recall.ai/api/v1/transcript/${transcriptId}/`,
      { headers: { Authorization: `Token ${Deno.env.get('RECALL_API_KEY')}` } },
    );
    if (!metaRes.ok) throw new Error(`GET transcript falhou: ${await metaRes.text()}`);
    const transcriptMeta = await metaRes.json();

    const downloadUrl: string | undefined =
      transcriptMeta.data?.download_url ?? transcriptMeta.download_url;
    if (!downloadUrl) throw new Error('transcript sem download_url');

    // O download_url é uma URL pré-assinada — sem header de auth.
    const transcriptJson = await (await fetch(downloadUrl)).json();
    const transcriptText = flattenTranscript(transcriptJson);

    const summary = await summarizeTranscript(transcriptText);

    const { error } = await supabase
      .from('session_transcripts')
      .update({ transcript: transcriptText, summary, status: 'completed' })
      .eq('recall_bot_id', botId);
    if (error) throw new Error(`update session_transcripts falhou: ${error.message}`);

    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('[recall-webhook]', String(err));
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
