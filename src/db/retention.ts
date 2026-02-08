import { db } from "./index";
import { getTodayStr } from "./utils";
import { formatDate, parseDate, addDays } from "@/utils/dateUtils";

const DEFAULT_RAW_RETENTION_DAYS = 7;
const MIN_RAW_RETENTION_DAYS = 1;
const META_KEY_RAW_RETENTION = "retention.rawDays";

export async function getRawRetentionDays(): Promise<number> {
  const record = await db.meta.get(META_KEY_RAW_RETENTION);
  if (typeof record?.value === "number" && record.value >= MIN_RAW_RETENTION_DAYS) {
    return record.value;
  }
  return DEFAULT_RAW_RETENTION_DAYS;
}

export async function setRawRetentionDays(days: number): Promise<void> {
  const clamped = Math.max(MIN_RAW_RETENTION_DAYS, Math.round(days));
  await db.meta.put({ key: META_KEY_RAW_RETENTION, value: clamped });
}

export async function aggregateOneDay(date: string): Promise<void> {
  await db.transaction("rw", db.hourlyStats, db.history, async () => {
    const hours = new Float64Array(24);

    await db.history
      .where("date")
      .equals(date)
      .each((r) => {
        const h = new Date(r.startTime).getHours();
        if (h >= 0 && h < 24) hours[h] += r.duration;
      });

    const rows = Array.from(hours)
      .map((duration, hour) => ({ date, hour, duration }))
      .filter((r) => r.duration > 0);

    await db.hourlyStats.where("date").equals(date).delete();
    await db.hourlyStats.bulkPut(rows);
    await db.history.where("date").equals(date).delete();
  });
}

// oxlint-disable-next-line max-lines-per-function
export async function runRetentionJob(maxDays = 3): Promise<void> {
  const rawRetentionDays = await getRawRetentionDays();
  const cutoff = formatDate(addDays(parseDate(getTodayStr()), -(rawRetentionDays - 1)));

  // oxlint-disable no-await-in-loop -- Sequential processing intentional: one day at a time
  for (let i = 0; i < maxDays; i++) {
    const oldest = await db.history.orderBy("date").first();
    if (!oldest || oldest.date >= cutoff) break;
    await aggregateOneDay(oldest.date);
  }
}
