import type { Channel, Reservation } from './types';
import type { Locale } from './i18n/locale';
import { localeToBcp47 } from './i18n/locale';

export const DEFAULT_ROOM_COUNT = 3;

function parseLocal(iso: string): Date {
  const s = iso.split('T')[0] ?? iso;
  const [y, m, day] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function daysInMonth(yyyyMM: string): number {
  const [y, mo] = yyyyMM.split('-').map(Number);
  return new Date(y, mo, 0).getDate();
}

export function addYearsToIsoDate(iso: string, years: number): string {
  const d = parseLocal(iso);
  d.setFullYear(d.getFullYear() + years);
  return toDateStr(d);
}

function addYearsToMonthKey(yyyyMM: string, years: number): string {
  const [y, m] = yyyyMM.split('-').map(Number);
  return `${y + years}-${String(m).padStart(2, '0')}`;
}

function eachMonthInRange(from: string, to: string, locale: Locale = 'en'): { key: string; label: string }[] {
  const a = parseLocal(from);
  const b = parseLocal(to);
  const out: { key: string; label: string }[] = [];
  const cur = new Date(a.getFullYear(), a.getMonth(), 1);
  const endM = new Date(b.getFullYear(), b.getMonth(), 1);
  const bcp = localeToBcp47(locale);
  while (cur.getTime() <= endM.getTime()) {
    const key = monthKey(cur);
    out.push({
      key,
      label: cur.toLocaleDateString(bcp, { month: 'short', year: '2-digit' }),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return out;
}

export type StayScope = 'all' | 'no_future' | 'only_ended';

/**
 * Reservas que se sobrepõem ao intervalo de datas (check-out exclusivo).
 * `refDate` = hoje (YYYY-MM-DD) para filtros "sem futuro" e "já terminadas".
 */
export function applyReservationFilters(
  list: Reservation[],
  opts: {
    from: string;
    to: string;
    channel: 'all' | Channel;
    room: 'all' | string;
    includeCancelled: boolean;
    refDate: string;
    stayScope: StayScope;
  }
): Reservation[] {
  return list.filter((r) => {
    if (!opts.includeCancelled && r.status === 'cancelled') return false;
    if (opts.channel !== 'all' && r.channel !== opts.channel) return false;
    if (opts.room !== 'all' && r.room !== opts.room) return false;
    const co = (r.check_out.split('T')[0] ?? r.check_out) as string;
    const ci = (r.check_in.split('T')[0] ?? r.check_in) as string;
    if (co <= opts.from) return false;
    if (ci > opts.to) return false;

    if (opts.stayScope === 'no_future' && ci > opts.refDate) return false;
    if (opts.stayScope === 'only_ended' && co > opts.refDate) return false;
    return true;
  });
}

export function nightCount(res: Reservation): number {
  if (res.status === 'cancelled') return 0;
  const a = parseLocal(res.check_in);
  const b = parseLocal(res.check_out);
  const n = Math.round((b.getTime() - a.getTime()) / 86400000);
  return Math.max(0, n);
}

export type MonthStatRow = {
  key: string;
  label: string;
  noites: number;
  receita: number;
  ocupacaoPct: number;
  diasNoMes: number;
  /** Tarifa média diária (receita do mês / noites). */
  adr: number;
  /** Receita por noite de capacidade = receita / (dias do mês × quartos), tipo RevPAR. */
  revpar: number;
  /** Ano homólogo (mês a mês) — se não houver dados, fica undefined. */
  prevYearOcup?: number;
  prevYearNoites?: number;
  prevYearReceita?: number;
  /** Diferença de p.p. face ao mesmo mês n-1. */
  yoyOcupPp?: number;
  /** Variação % de receita vs mesmo mês do ano anterior. */
  yoyReceitaPct?: number;
};

const monthSet = (keys: { key: string }[]) => new Set(keys.map((k) => k.key));

/**
 * Contabiliza noites (e receita pro-rata) por mês civil; respeita o intervalo [from, to] noite a noite.
 */
export function buildMonthlyStats(
  reservations: Reservation[],
  from: string,
  to: string,
  roomCount: number,
  locale: Locale = 'en'
): MonthStatRow[] {
  const monthRows = eachMonthInRange(from, to, locale);
  const validMonths = monthSet(monthRows);
  const byMonth = new Map<string, { noites: number; receita: number }>();
  for (const m of monthRows) {
    byMonth.set(m.key, { noites: 0, receita: 0 });
  }

  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const n = nightCount(r);
    if (n === 0) continue;
    const total = r.total_eur != null && Number.isFinite(r.total_eur) ? r.total_eur : 0;
    const perNight = n > 0 ? total / n : 0;
    const start = parseLocal(r.check_in);
    for (let i = 0; i < n; i++) {
      const day = addDays(start, i);
      const ds = toDateStr(day);
      if (ds < from || ds > to) continue;
      const mk = monthKey(day);
      if (!validMonths.has(mk)) continue;
      const cell = byMonth.get(mk);
      if (!cell) continue;
      cell.noites += 1;
      cell.receita += perNight;
    }
  }

  return monthRows.map((m) => {
    const d = byMonth.get(m.key)!;
    const diasM = daysInMonth(m.key);
    const cap = diasM * roomCount;
    const ocu = cap > 0 ? (d.noites / cap) * 100 : 0;
    const receita = Math.round(d.receita * 100) / 100;
    const adr = d.noites > 0 ? Math.round((receita / d.noites) * 100) / 100 : 0;
    const rev = cap > 0 ? Math.round((receita / cap) * 100) / 100 : 0;
    return {
      key: m.key,
      label: m.label,
      noites: d.noites,
      receita,
      ocupacaoPct: Math.round(ocu * 10) / 10,
      diasNoMes: diasM,
      adr,
      revpar: rev,
    };
  });
}

/**
 * Liga cada mês ao mesmo mês do ano anterior (para tendência e gráfico).
 */
export function attachYearOverYear(
  current: MonthStatRow[],
  allReservations: Reservation[],
  from: string,
  to: string,
  roomCount: number,
  filter: Omit<Parameters<typeof applyReservationFilters>[1], 'from' | 'to'>
): MonthStatRow[] {
  if (current.length === 0) return current;
  const fromP = addYearsToIsoDate(from, -1);
  const toP = addYearsToIsoDate(to, -1);
  const prevRes = applyReservationFilters(allReservations, { ...filter, from: fromP, to: toP });
  const prevRows = buildMonthlyStats(prevRes, fromP, toP, roomCount);
  const prevByKey = new Map(prevRows.map((r) => [r.key, r]));
  return current.map((c) => {
    const pKey = addYearsToMonthKey(c.key, -1);
    const p = prevByKey.get(pKey);
    if (!p) return c;
    const yoyOcupPp = Math.round((c.ocupacaoPct - p.ocupacaoPct) * 10) / 10;
    const yoyReceitaPct =
      p.receita > 0 ? Math.round(((c.receita - p.receita) / p.receita) * 1000) / 10 : 0;
    return {
      ...c,
      prevYearOcup: p.ocupacaoPct,
      prevYearNoites: p.noites,
      prevYearReceita: p.receita,
      yoyOcupPp,
      yoyReceitaPct,
    };
  });
}

export function summarizePeriod(rows: MonthStatRow[], roomCount: number) {
  const totalNights = rows.reduce((s, r) => s + r.noites, 0);
  const totalReceita = Math.round(rows.reduce((s, r) => s + r.receita, 0) * 100) / 100;
  const cap = rows.reduce((s, r) => s + r.diasNoMes * roomCount, 0);
  const occ = cap > 0 ? (totalNights / cap) * 100 : 0;
  const adrGeral = totalNights > 0 ? Math.round((totalReceita / totalNights) * 100) / 100 : 0;
  const revparGeral = cap > 0 ? Math.round((totalReceita / cap) * 100) / 100 : 0;
  return {
    totalNights,
    totalReceita,
    ocupacaoGeral: Math.round(occ * 10) / 10,
    adrGeral,
    revparGeral,
  };
}

export type ChannelSlice = { channel: Channel; noites: number; receita: number };

export function byChannelInPeriod(reservations: Reservation[]): ChannelSlice[] {
  const ch: Channel[] = ['airbnb', 'booking', 'direct'];
  const map = new Map<Channel, ChannelSlice>();
  for (const c of ch) {
    map.set(c, { channel: c, noites: 0, receita: 0 });
  }
  for (const r of reservations) {
    if (r.status === 'cancelled') continue;
    const n = nightCount(r);
    if (n === 0) continue;
    const total = r.total_eur != null && Number.isFinite(r.total_eur) ? r.total_eur : 0;
    const slice = map.get(r.channel);
    if (slice) {
      slice.noites += n;
      slice.receita += total;
    }
  }
  return ch.map((c) => {
    const s = map.get(c)!;
    return { ...s, receita: Math.round(s.receita * 100) / 100 };
  });
}

/**
 * Média de antecedência (dias entre criação da reserva e check-in), reservas com `created_at`.
 * Apenas reservas que se sobrepõem ao [from, to] no eixo da reserva, como `filtered`.
 */
export function meanLeadTimeDays(
  filtered: Reservation[]
): { mean: number | null; n: number } {
  const vals: number[] = [];
  for (const r of filtered) {
    if (r.status === 'cancelled' || !r.created_at) continue;
    const n = nightCount(r);
    if (n === 0) continue;
    const ci = parseLocal(r.check_in);
    const cr = new Date(r.created_at);
    if (Number.isNaN(cr.getTime())) continue;
    const days = (ci.getTime() - cr.getTime()) / 86400000;
    if (days < 0 || days > 3650) continue;
    vals.push(Math.round(days * 10) / 10);
  }
  if (vals.length === 0) return { mean: null, n: 0 };
  const s = vals.reduce((a, b) => a + b, 0) / vals.length;
  return { mean: Math.round(s * 10) / 10, n: vals.length };
}

/** % de reservas com noites>0 e receita nula (canal/OTA ainda sem valor). */
export function revenueGapsInFilter(filtered: Reservation[]): {
  withValue: number;
  withoutValue: number;
  missingSharePct: number;
} {
  let withV = 0;
  let withoutV = 0;
  for (const r of filtered) {
    if (r.status === 'cancelled') continue;
    const n = nightCount(r);
    if (n === 0) continue;
    if (r.total_eur == null || !Number.isFinite(r.total_eur)) {
      withoutV += 1;
    } else {
      withV += 1;
    }
  }
  const tot = withV + withoutV;
  return {
    withValue: withV,
    withoutValue: withoutV,
    missingSharePct: tot > 0 ? Math.round((withoutV / tot) * 1000) / 10 : 0,
  };
}

export function defaultDateRange() {
  const t = new Date();
  const to = toDateStr(t);
  const f = new Date(t);
  f.setMonth(f.getMonth() - 6);
  const from = toDateStr(f);
  return { from, to };
}
