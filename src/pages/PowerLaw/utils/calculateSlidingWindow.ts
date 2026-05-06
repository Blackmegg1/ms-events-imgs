import dayjs from 'dayjs';
import { calculatePowerLaw } from './calculatePowerLaw';
import type { EventItem, PowerLawResult, PowerLawError } from './calculatePowerLaw';

export interface WindowResult {
  windowStart: string;
  windowEnd: string;
  eventCount: number;
  result: PowerLawResult | PowerLawError;
}

/**
 * 在给定时间范围内按固定窗口大小滑动计算 G-R 参数。
 * 窗口不重叠，从 rangeStart 向后每 windowDays 天为一个窗口。
 */
export function calculateSlidingWindow(
  events: EventItem[],
  rangeStart: string,
  rangeEnd: string,
  windowDays: number,
): WindowResult[] {
  const results: WindowResult[] = [];
  let cursor = dayjs(rangeStart);
  const end = dayjs(rangeEnd);

  while (!cursor.isAfter(end)) {
    const windowEnd = cursor.add(windowDays - 1, 'day');
    const effectiveEnd = windowEnd.isAfter(end) ? end : windowEnd;

    const ws = cursor.format('YYYY-MM-DD');
    const we = effectiveEnd.format('YYYY-MM-DD');

    const windowEvents = events.filter((e) => {
      if (!e.time) return false;
      const d = e.time.substring(0, 10);
      return d >= ws && d <= we;
    });

    results.push({
      windowStart: ws,
      windowEnd: we,
      eventCount: windowEvents.length,
      result: calculatePowerLaw(windowEvents),
    });

    cursor = cursor.add(windowDays, 'day');

    if (results.length > 500) break;
  }

  return results;
}
