export type StayInterval = {
  room: string;
  check_in: string;
  check_out: string;
  status?: string;
};

function occupiesRoom(stay: StayInterval): boolean {
  return stay.status !== 'cancelled';
}

/** Check-out day is exclusive (same-day turnover is not a conflict). */
function datesOverlap(a: StayInterval, b: StayInterval): boolean {
  return a.check_in < b.check_out && b.check_in < a.check_out;
}

function roomKey(room: string): string {
  return room.trim();
}

export function detectConflict(candidate: StayInterval, existing: StayInterval[]): StayInterval[] {
  const candidateRoom = roomKey(candidate.room);
  return existing.filter(
    (stay) =>
      roomKey(stay.room) === candidateRoom && occupiesRoom(stay) && datesOverlap(candidate, stay)
  );
}
