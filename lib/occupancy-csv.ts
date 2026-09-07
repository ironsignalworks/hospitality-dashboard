import type { MonthStatRow } from './occupancy-analytics';

export type OccupancyTableHeaders = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
];

export function downloadOccupancyTableExcel(
  _from: string,
  _to: string,
  monthRows: MonthStatRow[],
  opts: { headers: OccupancyTableHeaders; filename: string }
) {
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
  const csv = ['\uFEFF' + opts.headers.join(';'), ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = opts.filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function escapeCsv(cell: string): string {
  if (cell.includes(';') || cell.includes('"') || cell.includes('\n')) {
    return `"${cell.replace(/"/g, '""')}"`;
  }
  return cell;
}
