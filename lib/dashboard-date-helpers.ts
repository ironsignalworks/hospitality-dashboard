export function formatDatePT(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('pt-PT', { weekday: 'short', day: 'numeric', month: 'short' });
}

export function stripTZ(dateStr: string) {
  return typeof dateStr === 'string' ? dateStr.split('T')[0] : dateStr;
}
