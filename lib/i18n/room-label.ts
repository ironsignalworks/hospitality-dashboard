import type { TFunction } from './translate';

/** Show built-in "Quarto n" / "Room n" labels in the active locale. Custom names stay as stored. */
export function displayRoomLabel(name: string, t: TFunction): string {
  const m = /^(?:Quarto|Room)\s+(\d+)$/i.exec(name.trim());
  if (!m) return name;
  return t('room.defaultName', { n: m[1] });
}
