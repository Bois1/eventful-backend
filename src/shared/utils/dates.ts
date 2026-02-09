export function parseISO8601Duration(duration: string): number {
  if (!duration || duration === 'P' || duration === 'PT') {
    throw new Error(`Invalid ISO 8601 duration: ${duration}`);
  }

  const regex = /^P(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
  const matches = duration.match(regex);
  
  if (!matches || duration === 'P' || duration === 'PT') {
    throw new Error(`Invalid ISO 8601 duration: ${duration}`);
  }

  const [, years, months, weeks, days, hours, minutes, seconds] = matches;

  let totalMs = 0;
  
  if (years) totalMs += parseInt(years) * 365 * 24 * 60 * 60 * 1000;
  if (months) totalMs += parseInt(months) * 30 * 24 * 60 * 60 * 1000;
  if (weeks) totalMs += parseInt(weeks) * 7 * 24 * 60 * 60 * 1000;
  if (days) totalMs += parseInt(days) * 24 * 60 * 60 * 1000;
  if (hours) totalMs += parseInt(hours) * 60 * 60 * 1000;
  if (minutes) totalMs += parseInt(minutes) * 60 * 1000;
  if (seconds) totalMs += parseInt(seconds) * 1000;

  return totalMs;
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function isPastDate(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function isFutureDate(date: Date): boolean {
  return date.getTime() > Date.now();
}