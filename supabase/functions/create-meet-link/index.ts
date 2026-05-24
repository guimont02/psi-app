// ============================================================
// PsiApp - Edge Function: create-meet-link
// Cria um "meeting space" do Google Meet via Meet REST API, com
// accessType OPEN — qualquer um com o link entra direto, sem sala
// de espera (paciente, psicólogo e o bot de transcrição).
//
// Secrets necessários (supabase secrets set ...):
//   GOOGLE_CLIENT_ID
//   GOOGLE_CLIENT_SECRET
//   GOOGLE_REFRESH_TOKEN   (precisa do escopo meetings.space.created)
//
// Pré-requisito: a "Google Meet API" precisa estar ativada no projeto
// do Google Cloud.
//
// Chamada pelo app no agendamento. A verificação de JWT do Supabase
// (verify_jwt = true, padrão) garante que só usuários logados chamam.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAccessToken(): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: Deno.env.get('GOOGLE_CLIENT_ID')!,
      client_secret: Deno.env.get('GOOGLE_CLIENT_SECRET')!,
      refresh_token: Deno.env.get('GOOGLE_REFRESH_TOKEN')!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`token exchange falhou: ${await res.text()}`);
  const data = await res.json();
  return data.access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const accessToken = await getAccessToken();

    const res = await fetch('https://meet.googleapis.com/v2/spaces', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        config: { accessType: 'OPEN', entryPointAccess: 'ALL' },
      }),
    });

    if (!res.ok) throw new Error(`Meet spaces.create falhou: ${await res.text()}`);
    const space = await res.json();

    const meetLink: string | undefined = space.meetingUri;
    if (!meetLink) throw new Error('Meet API não retornou meetingUri');

    return new Response(JSON.stringify({ meetLink, spaceName: space.name }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
