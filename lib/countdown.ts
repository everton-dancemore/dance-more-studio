/**
 * Pure date-math helpers for the wedding countdown UI.
 * No React, no side effects — easy to test.
 */

/**
 * Whole days between `from` (default: now) and the given ISO date.
 * Positive = in the future, negative = in the past, 0 = today.
 *
 * Both dates are compared at local midnight so the result rolls over at
 * the user's midnight rather than UTC midnight.
 */
export function daysUntil(iso: string, from: Date = new Date()): number {
  if (!iso) return Number.NaN;
  const target = parseDateOnly(iso);
  const fromMidnight = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const ms = target.getTime() - fromMidnight.getTime();
  return Math.round(ms / 86_400_000);
}

/**
 * Format the result of `daysUntil` as a short, friendly string.
 *   3   → "3 days to go"
 *   1   → "Tomorrow!"
 *   0   → "Today"
 *  -1   → "Yesterday"
 *  -7   → "7 days ago"
 */
export function formatCountdown(days: number): string {
  if (!Number.isFinite(days)) return '';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow!';
  if (days === -1) return 'Yesterday';
  if (days > 1) return `${days} days to go`;
  return `${Math.abs(days)} days ago`;
}

/**
 * Parse 'YYYY-MM-DD' as a local date at midnight (avoiding the JS quirk
 * where `new Date('2026-07-19')` is interpreted as UTC midnight, which can
 * shift the displayed date by a day depending on timezone).
 */
function parseDateOnly(iso: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return new Date(iso);
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d));
}
