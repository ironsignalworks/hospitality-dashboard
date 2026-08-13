import { jsPDF } from 'jspdf';
import type { Channel } from './types';
import type { MonthStatRow } from './occupancy-analytics';
import { summarizePeriod } from './occupancy-analytics';

const CHANNEL_LABEL: Record<Channel, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  direct: 'Direto',
};

export function downloadOccupancyPdf(input: {
  from: string;
  to: string;
  propertyName: string;
  roomCount: number;
  channel: string;
  room: string;
  includeCancelled: boolean;
  stayScopeLabel: string;
  monthRows: MonthStatRow[];
  byChannel: { channel: string; noites: number; receita: number }[];
  leadTimeMean: number | null;
  leadTimeN: number;
  receitaMissingSharePct: number;
}) {
  const {
    from,
    to,
    propertyName,
    roomCount,
    channel,
    room,
    includeCancelled,
    stayScopeLabel,
    monthRows,
    byChannel,
    leadTimeMean,
    leadTimeN,
    receitaMissingSharePct,
  } = input;
  const summary = summarizePeriod(monthRows, roomCount);
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;
  doc.setFontSize(16);
  doc.setTextColor(74, 74, 74);
  doc.text(`${propertyName} - Historico de ocupacao`, 14, y);
  y += 9;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`Periodo: ${from}  a  ${to}`, 14, y);
  y += 4;
  doc.text(
    `Filtros: canal ${channel} | quarto ${room} | estadias: ${stayScopeLabel} | canceladas: ${
      includeCancelled ? 'incl.' : 'excl.'
    } | cap.: ${roomCount} quarto(s)`,
    14,
    y
  );
  y += 4;
  if (receitaMissingSharePct > 0) {
    doc.setTextColor(180, 100, 40);
    doc.text(
      `Aviso: ${receitaMissingSharePct}% das reservas (com noites) sem valor de receita — totais subestimados.`,
      14,
      y
    );
    y += 4;
    doc.setTextColor(100, 100, 100);
  } else y += 1;
  if (leadTimeN > 0 && leadTimeMean != null) {
    doc.text(
      `Antecedencia media (criacao a check-in): ${leadTimeMean} dias (n=${leadTimeN} reservas)`,
      14,
      y
    );
    y += 4;
  } else y += 1;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  const line1 = `Totais: noites ${summary.totalNights}  |  receita ${summary.totalReceita.toFixed(2)} EUR  |  ocup. ${summary.ocupacaoGeral} %  |  ADR ${summary.adrGeral}  |  RevPAR ${summary.revparGeral}`;
  doc.text(line1, 14, y, { maxWidth: pageW - 24 });
  y += 5;

  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  const col = [9, 24, 38, 50, 61, 72, 85, 97];
  doc.setFillColor(240, 237, 230);
  doc.rect(8, y - 3, pageW - 16, 4.5, 'F');
  const headers = ['Mes', 'N', 'Eur', 'Ocup', 'ADR', 'RevP', 'YoYpp', 'Ano ant'];
  headers.forEach((h, i) => doc.text(h, col[i], y));
  y += 3.2;

  for (const r of monthRows) {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'normal');
    doc.text(r.label, col[0], y, { maxWidth: 20 });
    doc.text(String(r.noites), col[1], y);
    doc.text(r.receita.toFixed(0), col[2], y);
    doc.text(String(r.ocupacaoPct), col[3], y);
    doc.text(String(r.adr), col[4], y);
    doc.text(String(r.revpar), col[5], y);
    doc.text(r.yoyOcupPp != null ? String(r.yoyOcupPp) : '-', col[6], y);
    doc.text(
      r.prevYearOcup != null ? String(r.prevYearOcup) : '-',
      col[7],
      y
    );
    y += 3.5;
  }

  y += 3;
  if (y > 255) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(74, 74, 74);
  doc.text('Por canal (noites e receita, filtro):', 14, y);
  y += 5;
  doc.setFontSize(8);
  for (const c of byChannel) {
    const ch = c.channel in CHANNEL_LABEL ? CHANNEL_LABEL[c.channel as Channel] : c.channel;
    doc.text(`${ch} - ${c.noites} noites, ${c.receita.toFixed(2)} EUR`, 14, y);
    y += 3.5;
  }

  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Ocup. = noites alugadas / (dias do mes * quartos). Pro-rata. IVA/impostos conforme contabilidade.',
    10,
    doc.internal.pageSize.getHeight() - 10
  );
  doc.save(`historico-ocupacao-${from}.pdf`);
}
