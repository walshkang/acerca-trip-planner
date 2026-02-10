const MINUTES_PER_DAY = 24 * 60
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY

type OpeningPeriod = {
  openDay: number
  openMinute: number
  closeDay: number | null
  closeMinute: number | null
}

type EvaluateOpenNowInput = {
  openingHours: unknown
  referenceTime?: Date
  fallbackTimezone?: string | null
}

const WEEKDAY_TO_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function parseDay(rawDay: unknown): number | null {
  if (typeof rawDay !== 'number' || !Number.isInteger(rawDay)) return null
  if (rawDay < 0 || rawDay > 6) return null
  return rawDay
}

function parseTimeToMinute(rawTime: unknown): number | null {
  if (typeof rawTime !== 'string') return null
  const compact = rawTime.trim().replace(/:/g, '')
  if (!/^\d{3,4}$/.test(compact)) return null
  const padded = compact.padStart(4, '0')
  const hour = Number.parseInt(padded.slice(0, 2), 10)
  const minute = Number.parseInt(padded.slice(2, 4), 10)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour === 24 && minute === 0) return MINUTES_PER_DAY
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return hour * 60 + minute
}

function toWeekMinute(day: number, minute: number): number {
  if (minute === MINUTES_PER_DAY) {
    const nextDay = (day + 1) % 7
    return nextDay * MINUTES_PER_DAY
  }
  return day * MINUTES_PER_DAY + minute
}

function parseOpeningPeriods(openingHours: Record<string, unknown>): OpeningPeriod[] {
  const rawPeriods = openingHours.periods
  if (!Array.isArray(rawPeriods)) return []

  const parsed: OpeningPeriod[] = []
  for (const rawPeriod of rawPeriods) {
    const period = asRecord(rawPeriod)
    const rawOpen = asRecord(period?.open)
    if (!rawOpen) continue

    const openDay = parseDay(rawOpen.day)
    const openMinute = parseTimeToMinute(rawOpen.time)
    if (openDay === null || openMinute === null) continue

    const rawClose = asRecord(period?.close)
    if (!rawClose) {
      parsed.push({
        openDay,
        openMinute,
        closeDay: null,
        closeMinute: null,
      })
      continue
    }

    const closeDay = parseDay(rawClose.day)
    const closeMinute = parseTimeToMinute(rawClose.time)
    if (closeDay === null || closeMinute === null) {
      parsed.push({
        openDay,
        openMinute,
        closeDay: null,
        closeMinute: null,
      })
      continue
    }

    parsed.push({
      openDay,
      openMinute,
      closeDay,
      closeMinute,
    })
  }

  return parsed
}

function isValidIanaTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone })
    return true
  } catch {
    return false
  }
}

function extractTimezone(openingHours: Record<string, unknown>): string | null {
  const candidates = [
    openingHours.timezone,
    openingHours.time_zone,
    openingHours.iana_timezone,
  ]
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (!trimmed) continue
    if (isValidIanaTimezone(trimmed)) return trimmed
  }
  return null
}

function normalizeOffsetMinutes(raw: unknown): number | null {
  if (raw == null) return null
  let value: number
  if (typeof raw === 'number') value = raw
  else if (typeof raw === 'string' && raw.trim().length) {
    value = Number.parseInt(raw.trim(), 10)
  } else {
    return null
  }
  if (!Number.isFinite(value)) return null
  const truncated = Math.trunc(value)
  if (truncated >= -14 * 60 && truncated <= 14 * 60) {
    return truncated
  }
  if (truncated >= -14 * 3600 && truncated <= 14 * 3600 && truncated % 60 === 0) {
    return truncated / 60
  }
  return null
}

function extractUtcOffsetMinutes(openingHours: Record<string, unknown>): number | null {
  const candidates = [
    openingHours.utc_offset_minutes,
    openingHours.utcOffsetMinutes,
    openingHours.utc_offset,
  ]
  for (const candidate of candidates) {
    const parsed = normalizeOffsetMinutes(candidate)
    if (parsed !== null) return parsed
  }
  return null
}

function fallbackBooleanOpenNow(openingHours: Record<string, unknown>): boolean | null {
  return typeof openingHours.open_now === 'boolean' ? openingHours.open_now : null
}

function weekMinuteFromTimezone(referenceTime: Date, timezone: string): number | null {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(referenceTime)
  const weekdayToken = parts.find((part) => part.type === 'weekday')?.value
  const hourToken = parts.find((part) => part.type === 'hour')?.value
  const minuteToken = parts.find((part) => part.type === 'minute')?.value
  if (!weekdayToken || !hourToken || !minuteToken) return null
  const weekday = WEEKDAY_TO_INDEX[weekdayToken]
  const hour = Number.parseInt(hourToken, 10)
  const minute = Number.parseInt(minuteToken, 10)
  if (weekday == null || Number.isNaN(hour) || Number.isNaN(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return weekday * MINUTES_PER_DAY + hour * 60 + minute
}

function weekMinuteFromUtcOffset(referenceTime: Date, utcOffsetMinutes: number): number {
  const localMs = referenceTime.getTime() + utcOffsetMinutes * 60 * 1000
  const local = new Date(localMs)
  return (
    local.getUTCDay() * MINUTES_PER_DAY +
    local.getUTCHours() * 60 +
    local.getUTCMinutes()
  )
}

function isOpenAtWeekMinute(periods: OpeningPeriod[], weekMinute: number): boolean {
  const candidates = [weekMinute, weekMinute + MINUTES_PER_WEEK]
  for (const period of periods) {
    const open = toWeekMinute(period.openDay, period.openMinute)
    let close =
      period.closeDay === null || period.closeMinute === null
        ? open + MINUTES_PER_WEEK
        : toWeekMinute(period.closeDay, period.closeMinute)

    if (close <= open) close += MINUTES_PER_WEEK

    if (candidates.some((candidate) => candidate >= open && candidate < close)) {
      return true
    }
  }
  return false
}

export function evaluateOpenNow({
  openingHours,
  referenceTime = new Date(),
  fallbackTimezone = null,
}: EvaluateOpenNowInput): boolean | null {
  const openingHoursRecord = asRecord(openingHours)
  if (!openingHoursRecord) return null

  const periods = parseOpeningPeriods(openingHoursRecord)
  if (!periods.length) {
    return fallbackBooleanOpenNow(openingHoursRecord)
  }

  const timezoneCandidate = extractTimezone(openingHoursRecord)
  const timezone =
    timezoneCandidate ??
    (typeof fallbackTimezone === 'string' && isValidIanaTimezone(fallbackTimezone)
      ? fallbackTimezone
      : null)

  let weekMinute: number | null = null
  if (timezone) {
    weekMinute = weekMinuteFromTimezone(referenceTime, timezone)
  }
  if (weekMinute === null) {
    const offsetMinutes = extractUtcOffsetMinutes(openingHoursRecord)
    if (offsetMinutes !== null) {
      weekMinute = weekMinuteFromUtcOffset(referenceTime, offsetMinutes)
    }
  }
  if (weekMinute === null) {
    return fallbackBooleanOpenNow(openingHoursRecord)
  }

  return isOpenAtWeekMinute(periods, weekMinute)
}
