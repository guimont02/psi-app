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
//   RECALL_WEBHOOK_SECRET   (signing secret do endpoint no Recall, whsec_...)
// (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são injetados automaticamente)
//
// IMPORTANTE: deployar com verify_jwt = false — o Recall não manda
// JWT do Supabase. Quem autentica a origem aqui é a assinatura Svix,
// validada antes de qualquer uso do payload; sem o secret configurado
// a função rejeita tudo.
// ============================================================

import { createClient } from 'npm:@supabase/supabase-js@2';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

// Janela aceita para o timestamp assinado, em segundos.
const WEBHOOK_TOLERANCE_SECONDS = 5 * 60;

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

function decodeBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

// Valida a assinatura Svix que o Recall envia. Sem isso, qualquer um com a
// URL desta função poderia injetar uma transcrição falsa no caderno.
async function verifySvixSignature(req: Request, rawBody: string): Promise<boolean> {
  const secret = Deno.env.get('RECALL_WEBHOOK_SECRET');
  if (!secret) {
    console.error('[recall-webhook] RECALL_WEBHOOK_SECRET não configurado');
    return false;
  }

  const id = req.headers.get('svix-id') ?? req.headers.get('webhook-id');
  const timestamp = req.headers.get('svix-timestamp') ?? req.headers.get('webhook-timestamp');
  const signatures = req.headers.get('svix-signature') ?? req.headers.get('webhook-signature');
  if (!id || !timestamp || !signatures) return false;

  // Sem a janela de tempo, um payload legítimo capturado uma única vez
  // poderia ser reenviado para sempre, já que a assinatura continua válida.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > WEBHOOK_TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    decodeBase64(secret.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signed = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`),
  );
  const expected = new Uint8Array(signed);

  // O header vem como "v1,<assinatura> v1,<assinatura>" — durante uma rotação
  // de secret o Svix manda mais de uma, e basta uma bater.
  return signatures.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    if (version !== 'v1' || !value) return false;
    try {
      return timingSafeEqual(expected, decodeBase64(value));
    } catch {
      return false;
    }
  });
}

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
    // A assinatura cobre o corpo exato recebido, então ele precisa ser lido
    // como texto e só depois parseado — reserializar mudaria os bytes.
    const rawBody = await req.text();
    if (!(await verifySvixSignature(req, rawBody))) {
      console.error('[recall-webhook] assinatura inválida — requisição descartada');
      return new Response('unauthorized', { status: 401 });
    }

    const event = JSON.parse(rawBody);
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
    // O detalhe fica no log; a resposta é genérica porque este endpoint é
    // público e a mensagem de erro pode expor detalhes internos.
    console.error('[recall-webhook]', String(err));
    return new Response(JSON.stringify({ error: 'internal error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
