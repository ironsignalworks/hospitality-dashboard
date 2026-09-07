import { ROOMS } from '@/lib/config/rooms';

export interface AppSettings {
  room_count: number;
  room_names: string[];
  property_name: string;
  checkin_time: string;
  checkout_time: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  room_count: ROOMS.length,
  room_names: [...ROOMS],
  property_name: 'Your Property',
  checkin_time: '15:00',
  checkout_time: '11:00',
};

export function parseSettings(rows: { key: string; value: string }[]): AppSettings {
  const map: Record<string, string> = {};
  for (const row of rows) map[row.key] = row.value;

  const rawCount = parseInt(map['setting_room_count'] ?? '', 10);
  const roomCount = Number.isFinite(rawCount)
    ? Math.max(1, Math.min(6, rawCount))
    : DEFAULT_SETTINGS.room_count;

  const roomNames = Array.from({ length: roomCount }, (_, i) =>
    map[`setting_room_${i + 1}_name`] ??
    DEFAULT_SETTINGS.room_names[i] ??
    `Room ${i + 1}`
  );

  return {
    room_count: roomCount,
    room_names: roomNames,
    property_name: map['setting_property_name'] ?? DEFAULT_SETTINGS.property_name,
    checkin_time: map['setting_checkin_time'] ?? DEFAULT_SETTINGS.checkin_time,
    checkout_time: map['setting_checkout_time'] ?? DEFAULT_SETTINGS.checkout_time,
  };
}

export function settingsToRows(
  s: AppSettings
): { key: string; value: string; updated_at: string }[] {
  const now = new Date().toISOString();
  const rows: { key: string; value: string; updated_at: string }[] = [
    { key: 'setting_room_count',    value: String(s.room_count),   updated_at: now },
    { key: 'setting_property_name', value: s.property_name,        updated_at: now },
    { key: 'setting_checkin_time',  value: s.checkin_time,         updated_at: now },
    { key: 'setting_checkout_time', value: s.checkout_time,        updated_at: now },
  ];
  for (let i = 0; i < s.room_count; i++) {
    rows.push({
      key: `setting_room_${i + 1}_name`,
      value: s.room_names[i] ?? `Room ${i + 1}`,
      updated_at: now,
    });
  }
  return rows;
}
