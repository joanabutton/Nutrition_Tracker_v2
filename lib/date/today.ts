export type TodayRange = {
  start: Date;
  end: Date;
  label: string;
};

export function getTodayRange(timeZone: string, now = new Date()): TodayRange {
  const today = getDateParts(now, timeZone);
  const tomorrowUtc = new Date(Date.UTC(today.year, today.month - 1, today.day + 1));
  const tomorrow = getDateParts(tomorrowUtc, "UTC");

  return {
    start: zonedDateTimeToUtc(today.year, today.month, today.day, timeZone),
    end: zonedDateTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, timeZone),
    label: new Intl.DateTimeFormat("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone
    }).format(now)
  };
}

function getDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone,
    year: "numeric"
  }).formatToParts(date);

  return {
    year: Number(readPart(parts, "year")),
    month: Number(readPart(parts, "month")),
    day: Number(readPart(parts, "day"))
  };
}

function zonedDateTimeToUtc(year: number, month: number, day: number, timeZone: string) {
  const localMidnightAsUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const firstOffset = getTimeZoneOffsetMs(localMidnightAsUtc, timeZone);
  const firstGuess = new Date(localMidnightAsUtc.getTime() - firstOffset);
  const secondOffset = getTimeZoneOffsetMs(firstGuess, timeZone);

  return new Date(localMidnightAsUtc.getTime() - secondOffset);
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const timeZoneName = new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
    timeZoneName: "shortOffset"
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  if (!timeZoneName || timeZoneName === "GMT") {
    return 0;
  }

  const match = timeZoneName.match(/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/);

  if (!match) {
    throw new Error(`Could not parse time zone offset: ${timeZoneName}`);
  }

  const [, sign, hours, minutes = "0"] = match;
  const offset = (Number(hours) * 60 + Number(minutes)) * 60 * 1000;

  return sign === "-" ? -offset : offset;
}

function readPart(parts: Intl.DateTimeFormatPart[], type: Intl.DateTimeFormatPartTypes) {
  const value = parts.find((part) => part.type === type)?.value;

  if (!value) {
    throw new Error(`Could not read ${type} from formatted date`);
  }

  return value;
}
