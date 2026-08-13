export default function AboutFaqPage() {
  return (
    <div className="p-6 lg:p-8 pb-20 max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">Sobre o dashboard</h1>
        <p className="text-sm text-[#666] leading-relaxed">
          Painel de operações para uma propriedade pequena: reservas, hóspedes, mensagens,
          conteúdo de concierge e ocupação — com modo demo ou Supabase em produção.
        </p>
      </header>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">Princípio core</h2>
        <p className="text-sm text-[#4A4A4A] leading-relaxed">
          A equipa deixa de saltar entre o calendário do canal, a caixa de email e uma folha de
          Excel. Opera a casa num único sítio, e liga o que já existe (iCal, email transacional)
          em vez de fingir um PMS completo.
        </p>
      </section>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">FAQ rápido</h2>
        <div className="space-y-3 text-sm text-[#4A4A4A]">
          <div>
            <p className="font-semibold">Posso integrar Google Calendar ou outro calendário?</p>
            <p className="text-[#666]">
              Reservas entram por iCal (Airbnb, Booking, Beds24 e feeds semelhantes). Ligação
              nativa ao Google Calendar ainda não está implementada.
            </p>
          </div>
          <div>
            <p className="font-semibold">Posso usar Gmail, Outlook ou outro provedor de email?</p>
            <p className="text-[#666]">
              O inbox é interno ao painel. Campanhas e alertas ao dono saem via Resend. Sincronizar
              Gmail ou Outlook não está ligado.
            </p>
          </div>
          <div>
            <p className="font-semibold">Isto substitui o meu PMS atual?</p>
            <p className="text-[#666]">
              Pode ser o painel principal e sincronizar estadias por iCal. Não substitui um PMS
              completo nem faz push oficial para as APIs da Airbnb ou da Booking.
            </p>
          </div>
          <div>
            <p className="font-semibold">Dá para operar várias propriedades?</p>
            <p className="text-[#666]">
              O fluxo operacional é de uma propriedade (até 6 quartos). Cartões extra em Definições
              ficam só no browser e ainda não alimentam reservas nem ocupação.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
