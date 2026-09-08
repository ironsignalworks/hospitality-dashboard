export const ROOMS = ['Quarto 1', 'Quarto 2', 'Quarto 3'] as const;
export type RoomName = typeof ROOMS[number];
export const DEFAULT_ROOM = ROOMS[0];
