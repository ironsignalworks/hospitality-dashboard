import OpenAI from 'openai';

let _client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_client) {
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export async function draftReply(
  guestMessage: string,
  context: Record<string, string>
): Promise<string> {
  const client = getOpenAI();

  const systemPrompt = `És o assistente digital de um alojamento local.
Respondes de forma simpática, breve e útil, em Português Europeu.
Informações úteis disponíveis:
- Wi-Fi SSID: ${context.wifi_ssid ?? 'ver cartão no quarto'}
- Wi-Fi password: ${context.wifi_pass ?? 'ver cartão no quarto'}
- Check-in: ${context.checkin_instructions ?? 'chave na caixa junto à porta principal'}
- Pequeno-almoço: ${context.breakfast ?? 'não incluído, sugestões disponíveis no app'}
- Dicas da zona: ${context.tips ?? 'perguntar ao anfitrião'}

Responde apenas ao que te é perguntado. Se não souberes, diz "vou verificar e respondo já".`;

  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: guestMessage },
    ],
    max_tokens: 300,
    temperature: 0.6,
  });

  return completion.choices[0]?.message?.content ?? 'Obrigado pela mensagem, respondo em breve!';
}
