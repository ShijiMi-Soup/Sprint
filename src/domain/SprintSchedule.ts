const DAY_MS = 24 * 60 * 60 * 1000;

function parseDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    throw new Error(`Invalid date "${value}". Expected YYYY-MM-DD.`);
  }

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (formatDate(date) !== value) {
    throw new Error(`Invalid date "${value}".`);
  }
  return date;
}

function formatDate(date: Date): string {
  return [
    date.getUTCFullYear().toString().padStart(4, '0'),
    (date.getUTCMonth() + 1).toString().padStart(2, '0'),
    date.getUTCDate().toString().padStart(2, '0'),
  ].join('-');
}

export function addDays(value: string, days: number): string {
  return formatDate(new Date(parseDate(value).getTime() + days * DAY_MS));
}

export function getCurrentSprintStart(
  anchorDate: string,
  durationWeeks: number,
  today: string,
): string {
  const anchor = parseDate(anchorDate).getTime();
  const target = parseDate(today).getTime();
  const cycleDays = durationWeeks * 7;
  const elapsedDays = Math.floor((target - anchor) / DAY_MS);
  const cycleIndex = Math.floor(elapsedDays / cycleDays);
  return addDays(anchorDate, cycleIndex * cycleDays);
}

export function getSprintEnd(startDate: string, durationWeeks: number): string {
  return addDays(startDate, durationWeeks * 7 - 1);
}

export function enumerateSprintStarts(
  firstStart: string,
  lastStart: string,
  durationWeeks: number,
): string[] {
  const starts: string[] = [];
  const stepDays = durationWeeks * 7;
  for (let value = firstStart; value <= lastStart; value = addDays(value, stepDays)) {
    starts.push(value);
  }
  return starts;
}

export function getWeekStart(today: string, startDay: number): string {
  const date = parseDate(today);
  const offset = (date.getUTCDay() - startDay + 7) % 7;
  return addDays(today, -offset);
}

export function getLocalDate(date = new Date()): string {
  return [
    date.getFullYear().toString().padStart(4, '0'),
    (date.getMonth() + 1).toString().padStart(2, '0'),
    date.getDate().toString().padStart(2, '0'),
  ].join('-');
}
