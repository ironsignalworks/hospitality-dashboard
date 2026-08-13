export default function AboutFaqPage() {
  return (
    <div className="p-6 lg:p-8 pb-20 max-w-3xl space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-serif font-bold text-[#4A4A4A]">Sobre o dashboard</h1>
        <p className="text-sm text-[#666] leading-relaxed">
          Este produto foi desenhado para centralizar toda a operacao num unico painel: reservas, comunicacao,
          hospedes, conteudo e tarefas de acompanhamento.
        </p>
      </header>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">Principio core</h2>
        <p className="text-sm text-[#4A4A4A] leading-relaxed">
          A equipa deixa de alternar entre varias ferramentas soltas e passa a operar a propriedade via um dashboard
          unico, com modulos integraveis conforme a operacao cresce.
        </p>
      </section>

      <section className="rounded-2xl border border-[#E0DBCF] bg-white p-5 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[#888]">FAQ rapido</h2>
        <div className="space-y-3 text-sm text-[#4A4A4A]">
          <div>
            <p className="font-semibold">Posso integrar Google Calendar ou outro calendario?</p>
            <p className="text-[#666]">Sim. O modulo de reservas suporta integracoes por iCal/API e pode ligar a Google Calendar.</p>
          </div>
          <div>
            <p className="font-semibold">Posso usar Gmail, Outlook ou outro provedor de email?</p>
            <p className="text-[#666]">Sim. O fluxo de mensagens pode ser ligado ao provedor que a equipa ja usa.</p>
          </div>
          <div>
            <p className="font-semibold">Isto substitui o meu PMS atual?</p>
            <p className="text-[#666]">Depende do setup. Pode funcionar como painel principal e sincronizar com sistemas existentes.</p>
          </div>
          <div>
            <p className="font-semibold">Da para operar varias propriedades?</p>
            <p className="text-[#666]">Sim. O modulo de definicoes permite gerir varias propriedades e respetivos quartos.</p>
          </div>
        </div>
      </section>
    </div>
  );
}

