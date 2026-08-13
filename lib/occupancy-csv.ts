import type { MonthStatRow } from './occupancy-analytics';

/**
 * Ficheiro CSV (UTF-8 com BOM) que o Excel abre com colunas e acentos corretos.
 * Separador `;` (comum em PT-PT no Excel). Alinhado com a tabela do ecrã.
 */
export function downloadOccupancyTableExcel(from: string, to: string, monthRows: MonthStatRow[]) {
  const header = [
    'Mes (YYYY-MM)',
    'Rotulo',
    'Noites',
    'Receita (EUR)',
    'Ocupacao (%)',
    'ADR (EUR)',
    'RevPAR (EUR)',
    'Dias no mes',
    'Ocup ano ant (%)',
    'Rec ano ant (EUR)',
    'YoY ocup (pp)',
    'YoY receita (%)',
  ];
  const body = monthRows.map((r) =>
    [
      r.key,
      r.label,
      String(r.noites),
      String(r.receita),
      String(r.ocupacaoPct),
      String(r.adr),
      String(r.revpar),
      String(r.diasNoMes),
      r.prevYearOcup != null ? String(r.prevYearOcup) : '',
      r.prevYearReceita != null ? String(r.prevYearReceita) : '',
      r.yoyOcupPp != null ? String(r.yoyOcupPp) : '',
      r.yoyReceitaPct != null ? String(r.yoyReceitaPct) : '',
    ]
      .map(escapeCsv)
      .join(';')
  );
  const csv = ['\uFEFF' + header.join(';'), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `historico-ocupacao-tabela-${from}-a-${to}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeCsv(cell: string): string {
  if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
