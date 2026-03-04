import type { Day, TimeSlot } from "@/lib/api";

const EST_REFERENCE_DATES: Record<Day, string> = {
  Saturday: "2025-01-04",
  Sunday: "2025-01-05"
};

const EST_OFFSET_HOURS = 5;

const parseTime = (value: string): { hour: number; minute: number } => {
  const [hour, minute] = value.split(":").map(Number);
  return { hour, minute };
};

const buildUtcFromEst = (day: Day, time: string): Date => {
  const [year, month, date] = EST_REFERENCE_DATES[day].split("-").map(Number);
  const { hour, minute } = parseTime(time);
  return new Date(Date.UTC(year, month - 1, date, hour + EST_OFFSET_HOURS, minute));
};

const buildSlotUtcRange = (day: Day, slot: TimeSlot) => {
  const [start, end] = slot.split("-");
  return {
    startUtc: buildUtcFromEst(day, start),
    endUtc: buildUtcFromEst(day, end)
  };
};

const formatParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone
  });
  const parts = formatter.formatToParts(date);
  const weekday = parts.find(part => part.type === "weekday")?.value ?? "";
  const hour = parts.find(part => part.type === "hour")?.value ?? "";
  const minute = parts.find(part => part.type === "minute")?.value ?? "";
  return { weekday, time: `${hour}:${minute}` };
};

export const getUserTimeZone = (): string => {
  if (typeof Intl === "undefined") return "UTC";
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
};

export const formatSlotFromEst = (
  day: Day,
  slot: TimeSlot,
  timeZone: string
): { label: string; range: string } => {
  const { startUtc, endUtc } = buildSlotUtcRange(day, slot);

  const startLocal = formatParts(startUtc, timeZone);
  const endLocal = formatParts(endUtc, timeZone);

  const label =
    startLocal.weekday === endLocal.weekday
      ? `${startLocal.weekday} ${startLocal.time}`
      : `${startLocal.weekday} ${startLocal.time} -> ${endLocal.weekday} ${endLocal.time}`;

  const range =
    startLocal.weekday === endLocal.weekday
      ? `${startLocal.time}-${endLocal.time}`
      : `${startLocal.weekday} ${startLocal.time}-${endLocal.weekday} ${endLocal.time}`;

  return { label, range };
};

const formatRangeFromUtc = (startUtc: Date, endUtc: Date, timeZone: string): string => {
  const startLocal = formatParts(startUtc, timeZone);
  const endLocal = formatParts(endUtc, timeZone);

  return startLocal.weekday === endLocal.weekday
    ? `${startLocal.time}-${endLocal.time}`
    : `${startLocal.weekday} ${startLocal.time}-${endLocal.weekday} ${endLocal.time}`;
};

export const formatMergedSlotRangesFromEst = (
  day: Day,
  slots: TimeSlot[],
  timeZone: string
): string => {
  if (slots.length === 0) return "";

  const ranges = Array.from(new Set(slots))
    .map(slot => buildSlotUtcRange(day, slot))
    .sort((a, b) => a.startUtc.getTime() - b.startUtc.getTime());

  const merged: Array<{ startUtc: Date; endUtc: Date }> = [];

  for (const current of ranges) {
    const last = merged[merged.length - 1];

    if (!last) {
      merged.push({ ...current });
      continue;
    }

    if (last.endUtc.getTime() === current.startUtc.getTime()) {
      last.endUtc = current.endUtc;
      continue;
    }

    merged.push({ ...current });
  }

  return merged
    .map(item => formatRangeFromUtc(item.startUtc, item.endUtc, timeZone))
    .join(", ");
};
