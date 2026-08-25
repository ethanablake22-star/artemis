/**
 * Time and TimeZone utilities for Artemis Scheduling & Calendar (DST-Safe)
 */

export function getDefaultTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the offset in milliseconds between UTC and local time in `timeZone` at the given instant.
 */
export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== 'literal') map[p.type] = p.value;
  }

  const year = parseInt(map.year, 10);
  const month = parseInt(map.month, 10) - 1;
  const day = parseInt(map.day, 10);
  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(map.minute, 10);
  const second = parseInt(map.second, 10);

  const localTimeInUtc = Date.UTC(year, month, day, hour, minute, second);
  return localTimeInUtc - date.getTime();
}

/**
 * Converts local calendar date and time components into a UTC epoch timestamp (in milliseconds).
 */
export function localToUtc(
  year: number,
  month: number, // 1-12
  day: number,
  hour: number,
  minute: number,
  timeZone: string
): number {
  const targetLocalTime = Date.UTC(year, month - 1, day, hour, minute, 0);
  let utcTimestamp = targetLocalTime;
  for (let i = 0; i < 3; i++) {
    const offset = getTimeZoneOffsetMs(new Date(utcTimestamp), timeZone);
    utcTimestamp = targetLocalTime - offset;
  }
  return utcTimestamp;
}

/**
 * Parses "YYYY-MM-DD" and "HH:MM" in `timeZone` to UTC epoch milliseconds.
 */
export function localDateTimeToUtc(
  dateString: string, // YYYY-MM-DD
  timeString: string, // HH:MM
  timeZone: string = getDefaultTimeZone()
): number {
  const [yearStr, monthStr, dayStr] = dateString.split('-');
  const [hourStr, minStr] = timeString.split(':');

  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);
  const hour = parseInt(hourStr || '0', 10);
  const minute = parseInt(minStr || '0', 10);

  return localToUtc(year, month, day, hour, minute, timeZone);
}

/**
 * Computes DST-safe UTC epoch bounds for an all-day event in `timeZone`.
 *
 * For a 1-day event ("2026-08-25"):
 * startAt = local midnight of 2026-08-25
 * endAt = local midnight of 2026-08-26 (exclusive)
 *
 * For a multi-day event ("2026-08-25" through "2026-08-27"):
 * startAt = local midnight of 2026-08-25
 * endAt = local midnight of 2026-08-28 (exclusive)
 */
export function getAllDayBounds(
  startDateStr: string, // YYYY-MM-DD
  endDateStr?: string, // YYYY-MM-DD (inclusive end date)
  timeZone: string = getDefaultTimeZone()
): { startAt: number; endAt: number } {
  const [startYear, startMonth, startDay] = startDateStr.split('-').map((v) => parseInt(v, 10));
  const startAt = localToUtc(startYear, startMonth, startDay, 0, 0, timeZone);

  const targetEndDate = endDateStr || startDateStr;
  const [endYear, endMonth, endDay] = targetEndDate.split('-').map((v) => parseInt(v, 10));

  // Compute next day by calendar date math
  const nextDay = new Date(Date.UTC(endYear, endMonth - 1, endDay + 1));
  const nextYear = nextDay.getUTCFullYear();
  const nextMonth = nextDay.getUTCMonth() + 1;
  const nextDayNum = nextDay.getUTCDate();

  const endAt = localToUtc(nextYear, nextMonth, nextDayNum, 0, 0, timeZone);

  return { startAt, endAt };
}

/**
 * Formats a UTC timestamp to "YYYY-MM-DD" in the specified timezone.
 */
export function getDateKeyInZone(timestamp: number, timeZone: string = getDefaultTimeZone()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date(timestamp));
}

/**
 * Formats a UTC timestamp to time string (e.g. "9:00 AM") in the specified timezone.
 */
export function formatTimeInZone(timestamp: number, timeZone: string = getDefaultTimeZone()): string {
  return new Date(timestamp).toLocaleTimeString([], {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Formats a UTC timestamp to date string (e.g. "Wed, Aug 26, 2026") in the specified timezone.
 */
export function formatDateInZone(
  timestamp: number,
  timeZone: string = getDefaultTimeZone(),
  options?: Intl.DateTimeFormatOptions
): string {
  return new Date(timestamp).toLocaleDateString(undefined, {
    timeZone,
    weekday: options?.weekday ?? 'short',
    month: options?.month ?? 'short',
    day: options?.day ?? 'numeric',
    year: options?.year ?? 'numeric',
  });
}
