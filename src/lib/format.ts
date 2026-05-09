/** Money helpers — keep amounts in cents in the DB to avoid floats. */
export function formatCents(
  cents: number,
  currency: string = "EUR",
  locale: string = "de-DE",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}

/** Pretty date in dd MMM (e.g. "06 May"). */
export function formatShortDate(date: string | Date, locale = "en-GB"): string {
  const d = typeof date === "string" ? new Date(date + "T00:00:00") : date;
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
  }).format(d);
}

/** Relative day for the activity feed (Today / Yesterday / 06 May). */
export function formatRelativeDay(
  isoDate: string,
  todayLocal: Date = new Date(),
): string {
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date(
    todayLocal.getFullYear(),
    todayLocal.getMonth(),
    todayLocal.getDate(),
  );
  const diffDays = Math.round(
    (today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return formatShortDate(isoDate);
}

/** Mon-Sun string for a week starting on the given Monday. */
export function formatWeekRange(weekStartIso: string): string {
  const start = new Date(weekStartIso + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${formatShortDate(start)} – ${formatShortDate(end)}`;
}
