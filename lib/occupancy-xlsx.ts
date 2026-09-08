import * as XLSX from 'xlsx';
import type { MonthStatRow } from './occupancy-analytics';
import type { OccupancyTableHeaders } from './occupancy-csv';

export function downloadOccupancyXlsx(
  _from: string,
  _to: string,
  monthRows: MonthStatRow[],
  opts: { headers: OccupancyTableHeaders; sheetName: string; filename: string }
) {
  const aoa: (string | number)[][] = [[...opts.headers]];
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
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31));
  XLSX.writeFile(wb, opts.filename, { bookType: 'xlsx' });
}
