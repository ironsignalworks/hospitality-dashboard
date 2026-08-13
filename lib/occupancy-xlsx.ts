import * as XLSX from 'xlsx';
import type { MonthStatRow } from './occupancy-analytics';

/**
 * Ficheiro .xlsx (mesma informação que o ecrã / CSV, com folha "Resumo" opcional).
 */
export function downloadOccupancyXlsx(
  from: string,
  to: string,
  monthRows: MonthStatRow[],
  sheetName = 'Mensal'
) {
  const aoa: (string | number)[][] = [
    [
      'Mês (YYYY-MM)',
      'Rótulo',
      'Noites',
      'Receita (€)',
      'Ocup. %',
      'ADR (€)',
      'RevPAR (€)',
      'Dias mês',
      'Ocup. ano ant. %',
      'Rec. ano ant. (€)',
      'YoY ocup. (pp)',
      'YoY receita (%)',
    ],
  ];
  for (const r of monthRows) {
    aoa.push([
      r.key,
      r.label,
      r.noites,
      r.receita,
      r.ocupacaoPct,
      r.adr,
      r.revpar,
      r.diasNoMes,
      r.prevYearOcup ?? '',
      r.prevYearReceita ?? '',
      r.yoyOcupPp ?? '',
      r.yoyReceitaPct ?? '',
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  XLSX.writeFile(wb, `historico-ocupacao-${from}-a-${to}.xlsx`, { bookType: 'xlsx' });
}
