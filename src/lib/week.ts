/**
 * Helpers for "what week is it (Mon-Sun) in the challenge's local
 * timezone". Done in JS rather than via DB roundtrips because we
 * need the data at form-render time.
 */

/** ISO date (YYYY-MM-DD) for the given moment in the given timezone. */
export function localIsoDate(timezone: string, when: Date = new Date()): string {
  // 'en-CA' formats as YYYY-MM-DD. Combined with timeZone, we get the
  // local calendar date in that zone.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(when);
}

/** Day-of-week 1..7 (Mon..Sun) for an ISO date in a given timezone. */
function isoWeekday(isoDate: string, timezone: string): number {
  // Parse as midnight UTC to avoid local-machine TZ shifts, then
  // re-format weekday in the target timezone.
  const d = new Date(isoDate + "T12:00:00Z"); // noon UTC: safe across all zones
  const wd = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
  }).format(d);
  // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const map: Record<string, number> = {
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
    Sun: 7,
  };
  return map[wd] ?? 1;
}

/** Add `days` to an ISO date (YYYY-MM-DD), returning ISO. */
function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

export type WeekDay = {
  iso: string; // YYYY-MM-DD
  weekday: string; // "Mon"
  dayNum: number; // 4
  isToday: boolean;
  isFuture: boolean;
};

/**
 * Returns the 7 days of the current Mon-Sun week in the given timezone,
 * along with `today` and `weekStart` ISO strings.
 */
export function currentWeek(timezone: string): {
  today: string;
  weekStart: string;
  days: WeekDay[];
} {
  const today = localIsoDate(timezone);
  const weekday = isoWeekday(today, timezone); // 1..7
  const weekStart = addDays(today, -(weekday - 1));

  const days: WeekDay[] = [];
  const labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  for (let i = 0; i < 7; i++) {
    const iso = addDays(weekStart, i);
    const [, , dd] = iso.split("-");
    days.push({
      iso,
      weekday: labels[i],
      dayNum: Number(dd),
      isToday: iso === today,
      isFuture: iso > today,
    });
  }
  return { today, weekStart, days };
}
