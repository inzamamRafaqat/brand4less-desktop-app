import { CONFIG } from '../config/index.js';

/**
 * Store-local time helpers. Timestamps are stored in UTC (SQLite CURRENT_TIMESTAMP);
 * these translate to the shop's wall clock so "today" / "this month" and dated
 * report windows line up with the shop's day rather than the UTC day.
 */
const OFFSET_HOURS = CONFIG.STORE_TZ_OFFSET_HOURS;
const OFFSET_MS = OFFSET_HOURS * 3_600_000;

/** SQL fragment that shifts a stored UTC datetime expression to store-local time. */
export function sqlLocal(expr: string): string {
  const sign = OFFSET_HOURS >= 0 ? '+' : '-';
  return `datetime(${expr}, '${sign}${Math.abs(OFFSET_HOURS)} hours')`;
}

/** "Now" as a Date whose UTC getters read as store-local wall-clock time. */
export function localNow(): Date {
  return new Date(Date.now() + OFFSET_MS);
}

export function localDateStr(d: Date = localNow()): string {
  return d.toISOString().slice(0, 10);
}

export function localMonthStr(d: Date = localNow()): string {
  return d.toISOString().slice(0, 7);
}

export function localYearStr(d: Date = localNow()): string {
  return d.toISOString().slice(0, 4);
}

/** Store-local date string N days before today. */
export function localDaysAgoStr(n: number): string {
  return localDateStr(new Date(localNow().getTime() - n * 86_400_000));
}
