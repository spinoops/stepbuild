/** Formatage suisse : 12'345.60 */
export function fmtAmount(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return ''
  }
  const [int, dec] = value.toFixed(decimals).split('.')
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, "'")
  return dec ? `${grouped}.${dec}` : grouped
}

const DAY_ABBR = ['Di', 'Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa']

/** 26.08.2026 (avec « Me » si withDay). */
export function fmtDate(iso: string, withDay = false): string {
  const date = new Date(`${iso}T00:00:00`)
  const text = `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`
  return withDay ? `${text} ${DAY_ABBR[date.getDay()]}` : text
}

export function dayAbbr(year: number, month: number, day: number): string {
  return DAY_ABBR[new Date(year, month - 1, day).getDay()]
}

export function isWeekend(year: number, month: number, day: number): boolean {
  const weekday = new Date(year, month - 1, day).getDay()
  return weekday === 0 || weekday === 6
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
