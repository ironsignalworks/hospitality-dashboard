import { mockStorage } from '@/lib/mock-storage';
import { demoJson, guardDemoApi } from '@/lib/demo-http';
import type { Channel } from '@/lib/types';
import {
  DEFAULT_ROOM_COUNT,
  applyReservationFilters,
  buildMonthlyStats,
  defaultDateRange,
  type StayScope,
} from '@/lib/occupancy-analytics';

export async function GET(request: Request) {
  const blocked = await guardDemoApi(request);
  if (blocked) return blocked;

  const { searchParams } = new URL(request.url);
  const range = defaultDateRange();
  const from = searchParams.get('from') ?? range.from;
  const to = searchParams.get('to') ?? range.to;
  const channelRaw = searchParams.get('channel');
  const channel: 'all' | Channel =
    channelRaw === 'airbnb' || channelRaw === 'booking' || channelRaw === 'direct' ? channelRaw : 'all';
  const room = searchParams.get('room') ?? 'all';
  const stayRaw = searchParams.get('stayScope');
  const stayScope: StayScope =
    stayRaw === 'no_future' || stayRaw === 'only_ended' || stayRaw === 'all' ? stayRaw : 'all';
  const includeCancelled = searchParams.get('includeCancelled') === '1';
  const today = new Date().toISOString().split('T')[0];

  const filtered = applyReservationFilters(mockStorage.getReservations(), {
    from,
    to,
    channel,
    room,
    includeCancelled,
    refDate: today,
    stayScope,
  });
  const months = buildMonthlyStats(filtered, from, to, DEFAULT_ROOM_COUNT);

  return demoJson(
    request,
    {
      data: mockStorage.getReservations(),
      filtered,
      months,
    },
    { cache: true }
  );
}
