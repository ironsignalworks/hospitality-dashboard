# Casa da Judiaria — painel (dashboard) · resumo

Aplicação Next.js em `app/dashboard/`. Interface em português para acompanhar a casa, reservas, hóspedes, mensagens e o texto do concierge.

## Modo demo vs produção

| | **Demo** | **Produção (Supabase)** |
|---|----------|-------------------------|
| **Quando** | `NEXT_PUBLIC_SUPABASE_URL` em falta ou ainda a placeholder padrão | Projecto Supabase com URL + anon key reais em `.env` |
| **Dados** | Mocks em `lib/demo.ts` (hóspedes, reservas, mensagens, conteúdo) | Tabelas + auth via Supabase |
| **Auth** | Sem login: `proxy.ts` manda ` /dashboard/login` → `/dashboard` | Login obrigatório; sessão com cookies (SSR) |
| **Indicador** | Faixa amarela “Modo demo” no menu | — |

## Navegação

- **Desktop:** barra lateral com links + “Ver site público” e “Sair”.
- **Mobile:** barra fixa no topo, **menu hamburger** (drawer com os mesmos links) e **navegação por ícones** fixa no fundo (Hoje, Reservas, Hóspedes, Mensagens, Concierge).

Rutas: `/dashboard` (Hoje) · `reservations` · `guests` · `messages` · `content` · `login`.

---

## Páginas e funções

### **Hoje** — `/dashboard`

- Saudação (bom dia / tarde / noite) e data de “hoje”.
- **Ocupação** dos 3 quartos; cartão de **% e barra** “Ocupação agora”.
- Resumo de **check-ins / check-outs / hóspedes em estadia hoje** e lista dos próximos 7 dias.
- **Atalhos** — Nova reserva (modal rápido, como quarto livre), Mensagens, Concierge, Hóspedes.
- **KPIs** (lugar para métricas rápidas) e ligação à agenda semanal.
- *Fonte de dados:* reservas (demo ou Supabase) + contagem de mensagens não lidas (quando em produção).

### **Reservas** — `/dashboard/reservations`

- Vista por **mês** com calendário: quartos (linhas) × dias; reservas por célula com cor por canal (Airbnb / Booking / Direct).
- Painel com **duas abas** — **Próximas** e **Histórico** (estadias terminadas ou canceladas no passado) — e no histórico **Fatura / resumo** (texto informativo; não é documento fiscal certificado).
- Criar / editar / apagar reserva, alterar estados (confirmada, check-in, etc., conforme UI).
- Sincronização lógica com a base de hóspedes quando aplica hóspede a uma reserva.

### **Hóspedes** — `/dashboard/guests`

- Lista pesquisável de hóspedes com notas, email, contacto, nacionalidade.
- Ligar a estadias anteriores / próximas e ver estatísticas mínimas (ex.: nº de estadias, última estada).

### **Mensagens** — `/dashboard/messages`

- **Conversas** agrupadas (por hóspede / reserva).
- Ler thread, **marcar como tratada**, enviar resposta (hóspede / equipa / simulação de bot, conforme modelo de dados).
- *Em produção:* liga a tabelas de mensagens no Supabase.

### **Concierge (conteúdo)** — `/dashboard/content`

- Editar textos usados no site hóspede: **Wi-Fi**, check-in / check-out, pequeno-almoço, dicas, estacionamento.
- **Guardar** no Supabase (`concierge_content` key/value). Em demo, lê/escrê mocks locais.
- Atalho para a página pública de concierge (`/concierge`) quando exposto.

### **Login** — `/dashboard/login`

- Email + password (Supabase Auth) em produção. Em demo o fluxo é contornado a nível de proxy (sem credenciais reais).

---

## Lado de fora do UI (relevante para o painel)

- **APIs** (ex. `app/api/…`): `sync-ical` puxa iCal (Beds24) para reservas, mensagens, etc., conforme env e cron.
- **Proxy** (`proxy.ts` na raiz): protege `/dashboard/*` em produção (só com sessão). Em demo, sem Supabase, evita o login.
- Não entra no scope desta lista: o pitch de marketing no `/` da raiz do site.

---

*Útil para documentação operacional. Atualizar quando se mudarem rotas ou campos de dados.*
