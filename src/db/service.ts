// oxlint-disable no-array-reverse
// oxlint-disable max-lines-per-function
import { db } from "./index";
import type { EventSource, IHistoryLog, IPageStat, ISiteStat, PageKey, SiteKey } from "./types";
import { getTodayStr, normalizeUrl } from "./utils";
import { addDays, formatDate, parseDate } from "@/utils/dateUtils";

const MAX_DATE_QUERIES = 200;

interface DaySplit {
  date: string;
  startTime: number;
  duration: number;
}

function addSiteDuration(map: Map<string, ISiteStat>, stat: ISiteStat): void {
  const existing = map.get(stat.hostname);

  if (!existing) {
    map.set(stat.hostname, { ...stat });
    return;
  }

  existing.duration += stat.duration;
  if (stat.lastVisit > existing.lastVisit) {
    existing.lastVisit = stat.lastVisit;
  }
}

function getSortedTopSites(map: Map<string, ISiteStat>, limit: number): ISiteStat[] {
  return Array.from(map.values())
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}

function buildDailyMap(startDate: string, endDate: string): Map<string, number> {
  const dailyMap = new Map<string, number>();
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dailyMap.set(formatDate(current), 0);
    current = addDays(current, 1);
  }

  return dailyMap;
}

function toSortedTrend(dailyMap: Map<string, number>): { date: string; duration: number }[] {
  return Array.from(dailyMap.entries())
    .map(([date, duration]) => ({ date, duration }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildDateRangeDescending(startDate: string, endDate: string, limit: number): string[] {
  const dates: string[] = [];
  const start = parseDate(startDate);
  let current = parseDate(endDate);

  while (current >= start && dates.length < limit) {
    dates.push(formatDate(current));
    current = addDays(current, -1);
  }

  return dates;
}

function isTrackableWebUrl(url: string): boolean {
  return Boolean(url) && url.startsWith("http");
}

export function splitByMidnight(startTime: number, duration: number): DaySplit[] {
  if (duration <= 0) {
    return [];
  }

  const startDate = new Date(startTime);
  const endTime = startTime + duration;
  const nextMidnight = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + 1,
  ).getTime();

  if (endTime <= nextMidnight) {
    return [{ date: formatDate(startDate), startTime, duration }];
  }

  return [
    { date: formatDate(startDate), startTime, duration: nextMidnight - startTime },
    {
      date: formatDate(new Date(nextMidnight)),
      startTime: nextMidnight,
      duration: endTime - nextMidnight,
    },
  ];
}

export async function recordActivity(
  rawUrl: string,
  durationToAdd: number,
  title?: string,
  startTime?: number,
  eventSource?: EventSource,
) {
  if (durationToAdd <= 0 || !isTrackableWebUrl(rawUrl)) {
    return;
  }

  const { fullPath, hostname, path } = normalizeUrl(rawUrl);
  const actualStartTime = startTime ?? Date.now() - durationToAdd;
  const splits = splitByMidnight(actualStartTime, durationToAdd);

  if (splits.length === 0) {
    return;
  }

  await db.transaction("rw", db.history, db.sites, db.pages, async () => {
    // oxlint-disable no-await-in-loop -- Sequential awaits intentional: upsert pattern in Dexie transaction
    for (const split of splits) {
      const siteKey: SiteKey = [split.date, hostname];
      const pageKey: PageKey = [split.date, hostname, path];

      const pHistory = db.history.add({
        date: split.date,
        hostname,
        path,
        startTime: split.startTime,
        duration: split.duration,
        title,
        eventSource,
      });

      const pSiteGet = db.sites.get(siteKey);
      const pPageGet = db.pages.get(pageKey);

      const [, siteStat, pageStat] = await Promise.all([pHistory, pSiteGet, pPageGet]);

      let pSiteUpdate: Promise<unknown>;
      if (siteStat) {
        pSiteUpdate = db.sites.update(siteKey, {
          duration: siteStat.duration + split.duration,
          lastVisit: Math.max(siteStat.lastVisit, split.startTime + split.duration),
        });
      } else {
        pSiteUpdate = db.sites.add({
          date: split.date,
          hostname,
          duration: split.duration,
          lastVisit: split.startTime + split.duration,
        });
      }

      let pPageUpdate: Promise<unknown>;
      if (pageStat) {
        pPageUpdate = db.pages.update(pageKey, {
          duration: pageStat.duration + split.duration,
          title: title ?? pageStat.title,
        });
      } else {
        pPageUpdate = db.pages.add({
          date: split.date,
          hostname,
          path,
          fullPath,
          duration: split.duration,
          title,
        });
      }

      await Promise.all([pSiteUpdate, pPageUpdate]);
    }
  });
}

export async function getAggregatedSites(
  startDate: string,
  endDate: string,
  limit = 50,
): Promise<ISiteStat[]> {
  const siteMap = new Map<string, ISiteStat>();

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      addSiteDuration(siteMap, record);
    });

  return getSortedTopSites(siteMap, limit);
}

export async function getDailyTrend(
  startDate: string,
  endDate: string,
): Promise<{ date: string; duration: number }[]> {
  const dailyMap = buildDailyMap(startDate, endDate);

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      const currentDuration = dailyMap.get(record.date) ?? 0;
      dailyMap.set(record.date, currentDuration + record.duration);
    });

  return toSortedTrend(dailyMap);
}

export async function getRangeStats(
  startDate: string,
  endDate: string,
  limit = 50,
): Promise<{
  sites: ISiteStat[];
  trend: { date: string; duration: number }[];
}> {
  const sitesMap = new Map<string, ISiteStat>();
  const dailyMap = buildDailyMap(startDate, endDate);

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      addSiteDuration(sitesMap, record);

      const currentDuration = dailyMap.get(record.date) ?? 0;
      dailyMap.set(record.date, currentDuration + record.duration);
    });

  return {
    sites: getSortedTopSites(sitesMap, limit),
    trend: toSortedTrend(dailyMap),
  };
}

export async function getHourlyTrend(date: string): Promise<{ hour: string; duration: number }[]> {
  const hours = Array.from({ length: 24 }, (_, hour) => ({
    hour: hour.toString(),
    duration: 0,
  }));

  const aggregated = await db.hourlyStats.where("date").equals(date).toArray();
  for (const stat of aggregated) {
    if (stat.hour >= 0 && stat.hour < 24) {
      hours[stat.hour].duration += stat.duration;
    }
  }

  await db.history
    .where("date")
    .equals(date)
    .each((record) => {
      const hour = new Date(record.startTime).getHours();
      if (hour >= 0 && hour < 24) {
        hours[hour].duration += record.duration;
      }
    });

  return hours;
}

export async function getAggregatedPages(
  hostname: string,
  startDate: string,
  endDate: string,
): Promise<IPageStat[]> {
  const dayQueries: Promise<IPageStat[]>[] = [];
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    const dayStr = formatDate(current);
    dayQueries.push(db.pages.where("[date+hostname]").equals([dayStr, hostname]).toArray());
    current = addDays(current, 1);
  }

  const allPages = (await Promise.all(dayQueries)).flat();
  const pageMap = new Map<string, IPageStat>();

  for (const page of allPages) {
    const existing = pageMap.get(page.path);
    if (!existing) {
      pageMap.set(page.path, { ...page });
      continue;
    }

    existing.duration += page.duration;
  }

  return Array.from(pageMap.values()).sort((a, b) => b.duration - a.duration);
}

export async function getHistoryLogs(
  startDate: string,
  endDate: string,
  hostname?: string,
  path?: string,
  limit = 2000,
): Promise<IHistoryLog[]> {
  if (!hostname) {
    const startTs = parseDate(startDate).getTime();
    const endTs = addDays(parseDate(endDate), 1).getTime() - 1;

    let records = await db.history
      .where("startTime")
      .between(startTs, endTs, true, true)
      .reverse()
      .limit(limit)
      .toArray();

    if (path) {
      records = records.filter((record) => record.path === path);
    }

    return records;
  }

  const dates = buildDateRangeDescending(startDate, endDate, MAX_DATE_QUERIES);
  const dayResults = await Promise.all(
    dates.map((dayStr) => db.history.where("[date+hostname]").equals([dayStr, hostname]).toArray()),
  );

  const records: IHistoryLog[] = [];

  for (const dayRecords of dayResults) {
    dayRecords.sort((a, b) => b.startTime - a.startTime);

    const filteredRecords = path ? dayRecords.filter((record) => record.path === path) : dayRecords;

    records.push(...filteredRecords);

    if (records.length >= limit) {
      break;
    }
  }

  return records.slice(0, limit);
}

export function getTodayTopSites(limit = 10) {
  const today = getTodayStr();
  return getAggregatedSites(today, today, limit);
}

export function getSitePagesDetail(hostname: string) {
  const today = getTodayStr();
  return getAggregatedPages(hostname, today, today);
}

export async function deleteSiteData(hostname: string): Promise<void> {
  await db.transaction("rw", db.history, db.sites, db.pages, async () => {
    const historyKeys = await db.history
      .filter((record) => record.hostname === hostname)
      .primaryKeys();
    const pageKeys = await db.pages.filter((record) => record.hostname === hostname).primaryKeys();

    await Promise.all([
      historyKeys.length > 0 ? db.history.bulkDelete(historyKeys) : Promise.resolve(),
      db.sites.where("hostname").equals(hostname).delete(),
      pageKeys.length > 0 ? db.pages.bulkDelete(pageKeys) : Promise.resolve(),
    ]);
  });
}
