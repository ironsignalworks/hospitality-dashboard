import { jsPDF } from 'jspdf';
import type { MonthStatRow } from './occupancy-analytics';

export type OccupancyPdfCopy = {
  title: string;
  period: string;
  filters: string;
  warn: string | null;
  lead: string | null;
  totals: string;
  tableHeaders: string[];
  byChannelHeading: string;
  channelLine: (channel: string, nights: number, rev: string) => string;
  footer: string;
  filename: string;
};

export function downloadOccupancyPdf(input: {
  monthRows: MonthStatRow[];
  byChannel: { channel: string; noites: number; receita: number }[];
  copy: OccupancyPdfCopy;
}) {
  const { monthRows, byChannel, copy } = input;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  let y = 16;
  doc.setFontSize(16);
  doc.setTextColor(74, 74, 74);
  doc.text(copy.title, 14, y);
  y += 9;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(copy.period, 14, y);
  y += 4;
  doc.text(copy.filters, 14, y);
  y += 4;
  if (copy.warn) {
    doc.setTextColor(180, 100, 40);
    doc.text(copy.warn, 14, y);
    y += 4;
    doc.setTextColor(100, 100, 100);
  } else y += 1;
  if (copy.lead) {
    doc.text(copy.lead, 14, y);
    y += 4;
  } else y += 1;
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(9);
  doc.text(copy.totals, 14, y, { maxWidth: pageW - 24 });
  y += 5;

  doc.setFontSize(6.5);
  doc.setTextColor(0, 0, 0);
  const col = [9, 24, 38, 50, 61, 72, 85, 97];
  doc.setFillColor(240, 237, 230);
  doc.rect(8, y - 3, pageW - 16, 4.5, 'F');
  copy.tableHeaders.forEach((h, i) => doc.text(h, col[i], y));
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
    doc.text(r.prevYearOcup != null ? String(r.prevYearOcup) : '-', col[7], y);
    y += 3.5;
  }

  y += 3;
  if (y > 255) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(9);
  doc.setTextColor(74, 74, 74);
  doc.text(copy.byChannelHeading, 14, y);
  y += 5;
  doc.setFontSize(8);
  for (const c of byChannel) {
    doc.text(copy.channelLine(c.channel, c.noites, c.receita.toFixed(2)), 14, y);
    y += 3.5;
  }

  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(copy.footer, 10, doc.internal.pageSize.getHeight() - 10);
  doc.save(copy.filename);
}
