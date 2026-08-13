'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Bar,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  BarChart2,
  Download,
  FileSpreadsheet,
  Loader2,
  ArrowLeft,
  FileText,
} from 'lucide-react';
import { IS_DEMO, MOCK_RESERVATIONS } from '@/lib/demo';
import { useSettings } from '@/lib/hooks/use-settings';
import { createClient } from '@/lib/supabase';
import type { Reservation, Channel } from '@/lib/types';
import {
  applyReservationFilters,
  attachYearOverYear,
  buildMonthlyStats,
  byChannelInPeriod,
  defaultDateRange,
  DEFAULT_ROOM_COUNT,
  meanLeadTimeDays,
  revenueGapsInFilter,
  summarizePeriod,
  type StayScope,
} from '@/lib/occupancy-analytics';
import { downloadOccupancyPdf } from '@/lib/occupancy-pdf';
import { downloadOccupancyTableExcel } from '@/lib/occupancy-csv';
import { downloadOccupancyXlsx } from '@/lib/occupancy-xlsx';


const CHANNEL_OPTIONS: { id: 'all' | Channel; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'airbnb', label: 'Airbnb' },
  { id: 'booking', label: 'Booking' },
  { id: 'direct', label: 'Direto' },
];

const STAY_SCOPE: { id: StayScope; label: string; hint: string }[] = [
  { id: 'all', label: 'Todas as reservas', hint: 'Inclui estadias futuras no filtro' },
  { id: 'no_future', label: 'Sem reservas futuras', hint: 'Só com check-in já acontecido' },
  { id: 'only_ended', label: 'Apenas estadias concluídas', hint: 'Só com check-out já concluído' },
];

const PIE_COLORS = ['#FF5A5F', '#003580', '#708238'] as const;
const PIE_SWATCH = ['bg-[#FF5A5F]', 'bg-[#003580]', 'bg-[#708238]'] as const;

const CHANNEL_PIE_LABEL: Record<Channel, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking',
  direct: 'Direto',
};

const STAY_PDF: Record<StayScope, string> = {
  all: 'Todas',
  no_future: 'Sem check-in futuro',
  only_ended: 'So estadias terminadas',
};

const INPUT =
  'rounded-lg border border-[#E0DBCF] bg-white px-2.5 py-2 text-sm text-[#333] focus:outline-none focus:ring-2 focus:ring-[#DAA520]';

function ChannelPieTooltip({
  active,
  payload,
  byReceita,
}: {
  active?: boolean;
  payload?: readonly { payload: { channel: string; receita: number; noites: number } }[];
  byReceita: boolean;
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const p = item.payload as {
    channel: string;
    receita: number;
    noites: number;
  };
  const c = p.channel as Channel;
  const name = CHANNEL_PIE_LABEL[c] ?? p.channel;
  return (
    <div className="max-w-xs rounded-xl border border-[#E0DBCF] bg-white px-2.5 py-2 text-left text-xs leading-snug text-[#333] shadow-sm">
      {byReceita ? (
        <>
          <p className="text-[#888]">Origem da receita</p>
          <p className="font-serif font-semibold text-[#4A4A4A]">{name}</p>
          <p className="mt-1">
            <span className="text-[#888]">Receita: </span>
            <span className="font-medium tabular-nums text-[#333]">{p.receita.toFixed(2)} €</span>
          </p>
        </>
      ) : (
        <>
          <p className="text-[#888]">Canal (série por noite)</p>
          <p className="font-serif font-semibold text-[#4A4A4A]">{name}</p>
          <p className="mt-1">
            <span className="text-[#888]">Noites: </span>
            <span className="font-medium tabular-nums text-[#333]">
              {p.noites % 1 === 0 ? p.noites : p.noites.toFixed(1)}
            </span>
          </p>
          <p className="mt-0.5 text-[#999]">
            <span>Receita: </span>
            {p.receita > 0.005 ? (
              <span className="tabular-nums text-[#666]">{p.receita.toFixed(2)} €</span>
            ) : (
              <span>—</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}

function toIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function OccupancySkeleton() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-2xl border border-[#E0DBCF] bg-[#F0EDE6]/50"
          />
        ))}
      </div>
      <div className="h-10 w-2/3 animate-pulse rounded-lg bg-[#E8E4DA]/80" />
      <div className="h-80 animate-pulse rounded-2xl border border-[#E0DBCF] bg-[#FAFAF8]/80" />
    </div>
  );
}

export function OccupancyDashboard() {
  const settings = useSettings();
  const def = defaultDateRange();
  const [from, setFrom] = useState(def.from);
  const [to, setTo] = useState(def.to);
  const [channel, setChannel] = useState<'all' | Channel>('all');
  const [room, setRoom] = useState<'all' | string>('all');
  const [includeCancelled, setIncludeCancelled] = useState(false);
  const [stayScope, setStayScope] = useState<StayScope>('all');
  const [roomCount, setRoomCount] = useState(DEFAULT_ROOM_COUNT);
  const [list, setList] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [todayStr, setTodayStr] = useState(() => toIso(new Date()));
  useEffect(() => {
    setTodayStr(toIso(new Date()));
  }, []);

  useEffect(() => {
    let c = true;
    async function load() {
      setLoading(true);
      setErr(null);
      try {
        if (IS_DEMO) {
          if (!c) return;
          setList(MOCK_RESERVATIONS.map((r) => ({ ...r })));
          return;
        }
        const supabase = createClient();
        const { data, error } = await supabase
          .from('reservations')
          .select('*, guest:guests(id,name,email,phone,nationality,notes,created_at)')
          .order('check_in', { ascending: true });
        if (error) throw new Error(error.message);
        if (!c) return;
        setList((data as Reservation[]) ?? []);
      } catch (e) {
        if (c) setErr(e instanceof Error ? e.message : 'Erro a carregar reservas.');
      } finally {
        if (c) setLoading(false);
      }
    }
    void load();
    return () => {
      c = false;
    };
  }, []);

  const yoyFilter = useMemo(
    () => ({
      channel,
      room,
      includeCancelled,
      refDate: todayStr,
      stayScope,
    }),
    [channel, room, includeCancelled, todayStr, stayScope]
  );

  const filtered = useMemo(
    () => applyReservationFilters(list, { from, to, ...yoyFilter }),
    [list, from, to, yoyFilter]
  );

  const effectiveRoomCount = room === 'all' ? roomCount : 1;

  const monthRows = useMemo(() => {
    const base = buildMonthlyStats(filtered, from, to, effectiveRoomCount);
    return attachYearOverYear(base, list, from, to, effectiveRoomCount, yoyFilter);
  }, [filtered, list, from, to, effectiveRoomCount, yoyFilter]);

  const summary = useMemo(
    () => summarizePeriod(monthRows, effectiveRoomCount),
    [monthRows, effectiveRoomCount]
  );

  const byChannel = useMemo(() => byChannelInPeriod(filtered), [filtered]);
  const lead = useMemo(() => meanLeadTimeDays(filtered), [filtered]);
  const gaps = useMemo(() => revenueGapsInFilter(filtered), [filtered]);

  /** Texto do cartão de antecedência: sem jargão técnico. */
  const leadTimeKpiValue = useMemo(() => {
    if (lead.n > 0 && lead.mean != null) {
      return `${lead.mean} dias · ${lead.n} reservas`;
    }
    if (summary.totalNights === 0) {
      return 'Sem dados no período';
    }
    // Há estadias no filtro, mas faltam datas de registo nas reservas
    return 'Não calculável com os dados atuais';
  }, [lead, summary.totalNights]);

  const pieData = useMemo(
    () => byChannel.filter((x) => x.noites > 0 || x.receita > 0),
    [byChannel]
  );

  const chartData = useMemo(
    () =>
      monthRows.map((r) => ({
        name: r.label,
        Ocupacao: r.ocupacaoPct,
        OcupAnoAnt: r.prevYearOcup ?? null,
        Receita: r.receita,
        Noites: r.noites,
      })),
    [monthRows]
  );

  const applyPreset = useCallback((preset: '3m' | '6m' | '12m' | 'ytd') => {
    const t = new Date();
    const toD = toIso(t);
    const f = new Date(t);
    if (preset === '3m') f.setMonth(f.getMonth() - 3);
    if (preset === '6m') f.setMonth(f.getMonth() - 6);
    if (preset === '12m') f.setMonth(f.getMonth() - 12);
    if (preset === 'ytd') f.setMonth(0, 1);
    setTo(toD);
    setFrom(toIso(f));
  }, []);

  const handleDownloadPdf = useCallback(() => {
    downloadOccupancyPdf({
      from,
      to,
      propertyName: settings.property_name,
      roomCount: effectiveRoomCount,
      channel: CHANNEL_OPTIONS.find((c) => c.id === channel)?.label ?? 'Todos',
      room: room === 'all' ? 'Todos' : room,
      includeCancelled,
      stayScopeLabel: STAY_PDF[stayScope],
      monthRows,
      byChannel: byChannel.map((b) => ({ ...b })),
      leadTimeMean: lead.mean,
      leadTimeN: lead.n,
      receitaMissingSharePct: gaps.missingSharePct,
    });
  }, [byChannel, channel, from, includeCancelled, monthRows, room, to, effectiveRoomCount, stayScope, lead, gaps, settings]);

  const handleDownloadTableExcel = useCallback(() => {
    downloadOccupancyTableExcel(from, to, monthRows);
  }, [from, to, monthRows]);

  const handleDownloadXlsx = useCallback(() => {
    downloadOccupancyXlsx(from, to, monthRows);
  }, [from, to, monthRows]);

  const pieKey = useMemo(
    () => `pie-${from}-${to}-${channel}-${room}-${includeCancelled}-${stayScope}`,
    [from, to, channel, room, includeCancelled, stayScope]
  );

  const pieReceitaTotal = useMemo(
    () => pieData.reduce((s, p) => s + (p.receita > 0 ? p.receita : 0), 0),
    [pieData]
  );
  const pieNoitesTotal = useMemo(
    () => pieData.reduce((s, p) => s + Math.max(0, p.noites), 0),
    [pieData]
  );
  /** Recharts needs a positive `dataKey`; if receita is all zero, slice by noites. */
  const pieSlice = useMemo(() => {
    const byReceita = pieReceitaTotal >= 0.01;
    return {
      byReceita,
      rows: pieData.map((d) => ({
        ...d,
        slice: byReceita ? d.receita : d.noites,
      })),
    };
  }, [pieData, pieReceitaTotal]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-[#888] transition-colors hover:text-[#B8860B] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] rounded"
          >
            <ArrowLeft size={14} aria-hidden />
            Hoje
          </Link>
          <h1 className="font-serif text-2xl font-bold text-[#4A4A4A] sm:text-3xl">
            Histórico de ocupação
          </h1>
          <p className="mt-1 text-sm text-[#888]">
            Ocupação, receita, ADR, RevPAR, YoY, antecedência e export (CSV, XLSX, PDF).
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={loading || monthRows.length === 0}
          className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl border border-[#E0DBCF] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A4A4A] shadow-sm transition hover:border-[#DAA520] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download size={16} aria-hidden />
          PDF (relatório)
        </button>
      </div>

      <details className="group rounded-2xl border border-[#DAA520]/40 bg-[#FFFCF6] p-4 sm:p-5 open:bg-[#FFFCF6]">
        <summary className="cursor-pointer list-none text-sm font-semibold text-[#4A4A4A] [&::-webkit-details-marker]:hidden">
          <span className="underline decoration-[#DAA520]/50 underline-offset-2">Como interpretar a ocupação?</span>
          <span className="ml-2 text-xs font-normal text-[#888]">(clicar para expandir)</span>
        </summary>
        <div className="mt-3 space-y-2 text-sm leading-relaxed text-[#555]">
          <p>
            <strong>Ocupação % (mês):</strong> noites alugadas no mês (no teu filtro) ÷ (dias do mês ×
            n.º de quartos de capacidade). <strong>Exemplo:</strong> 3 quartos e 30 dias = 90 noites
            possíveis; 45 noites vendidas → 50%.
          </p>
          <p>
            <strong>RevPAR (€/noite de capacidade):</strong> receita atribuída ao mês (pro-rata) ÷
            (dias do mês × quartos), igual à receita por &quot;noite disponível&quot; da unidade.{' '}
            <strong>ADR:</strong> receita ÷ noites de estadia, tarifa média.
          </p>
          <p>
            <strong>YoY:</strong> o mesmo mês de calendário no <strong>ano homólogo</strong> (mesma
            lógica de filtro) para a linha a tracejado. Se não houver reservas nessa janela no ano
            anterior, a série pode ter um vazio.
          </p>
        </div>
      </details>

      <section
        className="rounded-2xl border border-[#E0DBCF] bg-white p-4 shadow-sm sm:p-5"
        aria-label="Filtros e capacidade"
      >
        <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-[#4A4A4A]">
          <BarChart2 className="text-[#DAA520]" size={18} aria-hidden />
          Categorias e intervalo
        </div>
        <div className="flex flex-wrap gap-2 pb-2">
          <span className="text-xs font-medium text-[#888]">Rápido:</span>
          {(
            [
              { id: '3m' as const, label: '3 meses' },
              { id: '6m' as const, label: '6 meses' },
              { id: '12m' as const, label: '12 meses' },
              { id: 'ytd' as const, label: 'Desde 1 Jan' },
            ] as const
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className="rounded-lg border border-[#E0DBCF] bg-[#FFFCF6] px-2.5 py-1 text-xs font-medium text-[#4A4A4A] transition hover:border-[#DAA520] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520]"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-[#666]">Desde</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={INPUT + ' w-full'}
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-[#666]">Até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={INPUT + ' w-full'}
            />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-[#666]">Canal</span>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value as 'all' | Channel)}
              className={INPUT + ' w-full'}
            >
              {CHANNEL_OPTIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs">
            <span className="mb-1 block font-medium text-[#666]">Quarto</span>
            <select
              value={room}
              onChange={(e) => setRoom(e.target.value as 'all' | string)}
              className={INPUT + ' w-full'}
            >
              <option value="all">Todos os quartos (agregado)</option>
              {settings.room_names.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3">
          <label className="block text-xs" htmlFor="ocup-stay">
            <span className="mb-1 block font-medium text-[#666]">Escopo de estadias (ref.: hoje)</span>
            <select
              id="ocup-stay"
              value={stayScope}
              onChange={(e) => setStayScope(e.target.value as StayScope)}
              className={INPUT + ' w-full sm:max-w-md'}
            >
              {STAY_SCOPE.map((o) => (
                <option key={o.id} value={o.id} title={o.hint}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-[11px] text-[#999]">
              {STAY_SCOPE.find((s) => s.id === stayScope)?.hint}
            </p>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-[#4A4A4A]">
            <input
              type="checkbox"
              checked={includeCancelled}
              onChange={(e) => setIncludeCancelled(e.target.checked)}
              className="size-4 rounded border-[#E0DBCF] text-[#DAA520] focus:ring-[#DAA520]"
            />
            Incluir reservas canceladas
          </label>
          <label className="flex items-center gap-2 text-sm text-[#4A4A4A]">
            <span className="whitespace-nowrap">Quartos (cap.):</span>
            <input
              type="number"
              min={1}
              max={50}
              value={roomCount}
              onChange={(e) => setRoomCount(Math.min(50, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-[#E0DBCF] px-2 py-1 text-sm"
            />
          </label>
        </div>
        {room !== 'all' && (
          <p className="mt-3 text-xs text-[#888]">
            Filtro por um quarto: 100% = noites desse quarto. Com &quot;Todos os quartos&quot; usa
            a capacidade acima.
          </p>
        )}
        {includeCancelled && (
          <p className="mt-1 text-xs text-amber-800">Canceladas: 0 noites; receita não entra no total.</p>
        )}
      </section>

      {err && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {err}
        </p>
      )}

      {loading ? (
        <div className="min-h-[200px] space-y-2" aria-busy>
          <p className="text-center text-sm text-[#888]">A carregar reservas…</p>
          <OccupancySkeleton />
        </div>
      ) : (
        <>
          {gaps.missingSharePct > 0 && (
            <div
              className="rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950"
              role="status"
            >
              <strong>Aviso (qualidade de dados):</strong> {gaps.missingSharePct}% das reservas com
              noites têm <strong>receita nula</strong> (OTAs/calendário) — <strong>ADR, RevPAR e
              gráfico</strong> de receita podem estar <strong>subestimados</strong>. Completar totais
              em Reservas.
            </div>
          )}

          <section
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            aria-label="Totais do periodo selecionado"
          >
            {(
              [
                { k: 'Ocupação (período)', v: `${summary.ocupacaoGeral} %` },
                { k: 'Noites (filtro)', v: String(summary.totalNights) },
                { k: 'Receita (pro-rata no período)', v: `€${summary.totalReceita.toFixed(0)}` },
                { k: 'ADR (tarifa média / noite)', v: `€${summary.adrGeral.toFixed(1)}` },
                { k: 'RevPAR (receita / noite de capac.)', v: `€${summary.revparGeral.toFixed(2)}` },
                {
                  k: 'Antecedência média (dias)',
                  v: leadTimeKpiValue,
                },
              ] as { k: string; v: string }[]
            ).map((c) => (
              <div
                key={c.k}
                className="rounded-2xl border border-[#E0DBCF] bg-gradient-to-b from-white to-[#FFFCF6] p-4 shadow-sm"
              >
                <p className="text-[10px] font-medium uppercase leading-tight tracking-wide text-[#888] sm:text-[11px]">
                  {c.k}
                </p>
                <p className="mt-1.5 break-words text-lg font-bold tabular-nums text-[#4A4A4A] sm:text-2xl">
                  {c.v}
                </p>
              </div>
            ))}
          </section>

          {monthRows.length > 0 ? (
            <section
              className="space-y-4 rounded-2xl border border-[#E0DBCF] bg-white p-4 shadow-sm sm:p-6"
              aria-label="Grafico"
            >
              <h2 className="font-serif text-lg font-bold text-[#4A4A4A]">Série mensal</h2>
              <p className="text-sm text-[#888]">
                Barras = receita; linha sólida = ocupação; linha a tracejado = mesmo mês, ano
                homólogo (dados nesse recorte n-1).
              </p>
              <div className="h-80 w-full min-h-[280px] max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#E0DBCF" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 9 }} height={32} />
                    <YAxis
                      yAxisId="left"
                      domain={[0, 100]}
                      tick={{ fontSize: 9 }}
                      width={36}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      width={40}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`)}
                    />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, borderColor: '#E0DBCF', fontSize: 12 }}
                      labelStyle={{ color: '#4A4A4A', fontWeight: 600 }}
                      formatter={(value, name) => {
                        if (name === 'Ocupação %' || name === 'Ocup. ano ant. (%)') {
                          return [value == null || Number.isNaN(Number(value)) ? '—' : `${Number(value).toFixed(1)}%`, String(name)];
                        }
                        if (name === 'Receita (€)' || name === 'Receita') {
                          return [`${Number(value).toFixed(2)} €`, 'Receita'];
                        }
                        if (name === 'Noites') return [String(value), 'Noites'];
                        return [String(value), String(name)];
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 10 }} />
                    <Bar
                      yAxisId="right"
                      dataKey="Receita"
                      fill="#DAA520"
                      name="Receita (€)"
                      maxBarSize={40}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="Ocupacao"
                      stroke="#4A4A4A"
                      strokeWidth={2}
                      dot={false}
                      name="Ocupação %"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="OcupAnoAnt"
                      name="Ocup. ano ant. (%)"
                      stroke="#8B7E66"
                      strokeWidth={1.5}
                      strokeDasharray="5 4"
                      connectNulls={false}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </section>
          ) : null}

          {monthRows.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {pieData.length > 0 && (
                <section
                  className="rounded-2xl border border-[#E0DBCF] bg-white p-4 shadow-sm sm:p-5"
                  aria-label="Resumo por canal"
                >
                  <h2 className="font-serif text-lg font-bold text-[#4A4A4A]">Mix por canal</h2>
                  <p className="mt-1 text-sm text-[#888]">Noites e receita (reservas do filtro).</p>
                  <p className="mb-1 mt-2 text-center text-[10px] text-[#999] sm:text-xs">
                    {pieSlice.byReceita
                      ? 'Partilha de receita — legenda (sem rótulo no círculo, evita corte)'
                      : 'Partilha de noites (receita por canal indisponível ou zero) — legenda'}
                  </p>
                  <div className="relative mx-auto mt-1 w-full min-w-[200px] max-w-sm px-1 sm:px-3">
                    <div className="h-[220px] w-full min-h-[220px] sm:h-56 sm:min-h-56">
                      <ResponsiveContainer width="100%" height="100%" debounce={1}>
                        <PieChart
                          key={pieKey}
                          margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                        >
                          <Pie
                            data={pieSlice.rows}
                            dataKey="slice"
                            nameKey="channel"
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={84}
                            paddingAngle={2}
                            label={false}
                            isAnimationActive
                            animationDuration={1000}
                            animationEasing="ease-out"
                            animationBegin={80}
                            stroke="#fff"
                            strokeWidth={2}
                          >
                            {pieSlice.rows.map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            content={({ active, payload: pl }) => {
                              const slice = pl as readonly {
                                payload: { channel: string; receita: number; noites: number };
                              }[] | undefined;
                              return (
                                <ChannelPieTooltip
                                  active={active}
                                  payload={slice}
                                  byReceita={pieSlice.byReceita}
                                />
                              );
                            }}
                            wrapperStyle={{ zIndex: 1 }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <ul
                    className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-xs text-[#4A4A4A] sm:gap-x-4 sm:text-sm"
                    aria-label="Legenda do gráfico"
                  >
                    {pieData.map((d, i) => {
                      const denom = pieSlice.byReceita ? pieReceitaTotal : pieNoitesTotal;
                      const num = pieSlice.byReceita ? d.receita : d.noites;
                      const rel =
                        denom > 0 ? Math.round((num / denom) * 1000) / 10 : 0;
                      const c = d.channel as Channel;
                      return (
                        <li key={d.channel} className="flex min-w-0 max-w-full items-baseline gap-1.5">
                          <span
                            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${PIE_SWATCH[i % PIE_SWATCH.length]}`}
                            aria-hidden
                          />
                          <span className="min-w-0 break-words font-medium">
                            {CHANNEL_PIE_LABEL[c] ?? d.channel}{' '}
                            <span className="whitespace-nowrap text-[#888]">({rel}%)</span>
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  <ul className="mt-2 space-y-1.5 text-sm text-[#4A4A4A]">
                    {byChannel.map((b) => (
                      <li
                        key={b.channel}
                        className="flex justify-between border-b border-[#F0EDE6] py-1.5 last:border-0"
                      >
                        <span className="capitalize">{b.channel}</span>
                        <span>
                          {b.noites} noit. · {b.receita.toFixed(0)} €
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section
                className={
                  pieData.length > 0
                    ? 'rounded-2xl border border-[#E0DBCF] bg-white p-4 shadow-sm sm:p-5'
                    : 'rounded-2xl border border-[#E0DBCF] bg-white p-4 shadow-sm sm:p-5 lg:col-span-2'
                }
                aria-label="Tabela mensal"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-serif text-lg font-bold text-[#4A4A4A]">Tabela (exportável)</h2>
                    <p className="mt-1 text-sm text-[#888]">
                      Mesma série que o gráfico. CSV, XLSX (Excel) ou PDF completo.
                    </p>
                  </div>
                  <div className="flex flex-shrink-0 flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={handleDownloadTableExcel}
                      disabled={monthRows.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E0DBCF] bg-[#F8F7F2] px-2.5 py-2 text-xs font-semibold text-[#1d6f42] shadow-sm transition hover:border-[#1d6f42]/50 hover:bg-[#eef7ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6f42] disabled:cursor-not-allowed disabled:opacity-50"
                      title="UTF-8 ; — abre no Excel"
                    >
                      <FileSpreadsheet size={14} className="shrink-0" aria-hidden />
                      Excel (CSV)
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadXlsx}
                      disabled={monthRows.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#1d6f42]/40 bg-white px-2.5 py-2 text-xs font-semibold text-[#1d6f42] shadow-sm transition hover:bg-[#eef7ef] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1d6f42] disabled:cursor-not-allowed disabled:opacity-50"
                      title="Ficheiro .xlsx (Excel nativo)"
                    >
                      <FileSpreadsheet size={14} className="shrink-0" aria-hidden />
                      XLSX
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={loading || monthRows.length === 0}
                      className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#E0DBCF] bg-white px-2.5 py-2 text-xs font-semibold text-[#4A4A4A] shadow-sm transition hover:border-[#DAA520] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#DAA520] disabled:cursor-not-allowed disabled:opacity-50"
                      title="Relatório PDF: totais, ADR, RevPAR, lead time, tabela, canais"
                    >
                      <FileText size={14} className="shrink-0" aria-hidden />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="mt-3 w-full min-w-0 max-w-full overflow-x-auto [scrollbar-gutter:stable]">
                  <p className="mb-1 text-[10px] text-[#999] sm:hidden">Desliza ➡ para colunas e YoY</p>
                  <div className="min-w-[640px] sm:min-w-0">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead>
                        <tr className="border-b border-[#E0DBCF] text-[#888]">
                          <th className="whitespace-nowrap py-2 pr-2">Mês</th>
                          <th className="whitespace-nowrap py-2 pr-2">Noites</th>
                          <th className="whitespace-nowrap py-2 pr-2">Receita</th>
                          <th className="whitespace-nowrap py-2 pr-2">Ocup.</th>
                          <th className="hidden sm:table-cell whitespace-nowrap py-2 pr-2" title="Tarifa média / noite">
                            ADR
                          </th>
                          <th className="hidden md:table-cell whitespace-nowrap py-2 pr-2" title="Receita / noite de capac.">
                            RevP.
                          </th>
                          <th className="whitespace-nowrap py-2 pr-2" title="Ano homólogo, mesmo mês">
                            Ocup. n-1
                          </th>
                          <th className="whitespace-nowrap py-2" title="Variação p.p. de ocup.">
                            YoY ocu
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthRows.map((r) => (
                          <tr key={r.key} className="border-b border-[#F5F3ED]">
                            <td className="whitespace-nowrap py-1.5 pr-2 text-[#4A4A4A]">{r.label}</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{r.noites}</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{r.receita.toFixed(0)} €</td>
                            <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums">{r.ocupacaoPct}%</td>
                            <td className="hidden sm:table-cell whitespace-nowrap py-1.5 pr-2 tabular-nums text-[#666]">
                              {r.adr} €
                            </td>
                            <td className="hidden md:table-cell whitespace-nowrap py-1.5 pr-2 tabular-nums text-[#666]">
                              {r.revpar}
                            </td>
                            <td className="whitespace-nowrap py-1.5 pr-2 tabular-nums text-[#8B7E66]">
                              {r.prevYearOcup != null ? `${r.prevYearOcup}%` : '—'}
                            </td>
                            <td
                              className={
                                'whitespace-nowrap py-1.5 tabular-nums ' +
                                (r.yoyOcupPp != null && r.yoyOcupPp > 0
                                  ? 'text-green-800'
                                  : r.yoyOcupPp != null && r.yoyOcupPp < 0
                                    ? 'text-red-800/90'
                                    : 'text-[#4A4A4A]')
                              }
                            >
                              {r.yoyOcupPp != null ? (r.yoyOcupPp > 0 ? `+` : '') + r.yoyOcupPp : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            </div>
          )}

          {!loading && monthRows.length === 0 && list.length > 0 && (
            <div className="space-y-3 text-center text-sm text-[#888]">
              <p>Sem dados do intervalo na combinação de filtros. Alarga o período ou repõe o escopo de estadias.</p>
            </div>
          )}
          {!loading && list.length === 0 && (
            <div className="space-y-2 rounded-2xl border border-dashed border-[#E0DBCF] bg-white/80 px-4 py-8 text-center text-sm text-[#888]">
              <p>Sem reservas na base.</p>
              <p>
                <Link
                  className="font-semibold text-[#B8860B] underline underline-offset-2 hover:text-[#9a7200]"
                  href="/dashboard/reservations"
                >
                  Criar ou importar reservas
                </Link>
                {' · '}
                <span className="text-[#AAA]">(hospedes / iCal consoante o teu setup)</span>
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
