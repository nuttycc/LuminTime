// oxlint-disable no-array-reverse
// oxlint-disable max-lines-per-function
import { db } from "./index";
import type { SiteKey, PageKey, ISiteStat, IPageStat, IHistoryLog, EventSource } from "./types";
import { normalizeUrl, getTodayStr } from "./utils";
import { addDays, formatDate, parseDate } from "@/utils/dateUtils";

interface DaySplit {
  date: string;
  startTime: number;
  duration: number;
  eventSource?: EventSource;
}

/**
 * 按午夜边界拆分时间段（最多拆成两段）
 */
export function splitByMidnight(startTime: number, duration: number): DaySplit[] {
  if (duration <= 0) return [];

  const startDate = new Date(startTime);
  const endTime = startTime + duration;
  const nextMidnight = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate() + 1,
  ).getTime();

  // 未跨日
  if (endTime <= nextMidnight) {
    return [{ date: formatDate(startDate), startTime, duration }];
  }

  // 跨日：拆成两段
  return [
    { date: formatDate(startDate), startTime, duration: nextMidnight - startTime },
    {
      date: formatDate(new Date(nextMidnight)),
      startTime: nextMidnight,
      duration: endTime - nextMidnight,
    },
  ];
}

/**
 * 核心写入方法：原子性更新三层数据，支持跨日拆分
 * @param rawUrl 原始 URL
 * @param durationToAdd 增加的时长 (毫秒)
 * @param title 网页标题 (可选)
 * @param startTime 会话开始时间戳 (可选，默认为 now - duration)
 * @param eventSource 事件来源 (可选)
 */
export async function recordActivity(
  rawUrl: string,
  durationToAdd: number,
  title?: string,
  startTime?: number,
  eventSource?: EventSource,
) {
  if (!rawUrl || durationToAdd <= 0) return;
  if (!rawUrl.startsWith("http")) return;

  const { hostname, path, fullPath } = normalizeUrl(rawUrl);
  const now = Date.now();
  const actualStartTime = startTime ?? now - durationToAdd;

  // 按午夜边界拆分
  const splits = splitByMidnight(actualStartTime, durationToAdd);
  if (splits.length === 0) return;

  await db.transaction("rw", db.history, db.sites, db.pages, async () => {
    // oxlint-disable no-await-in-loop -- Sequential awaits intentional: upsert pattern in Dexie transaction
    for (const split of splits) {
      // 1. L1: 插入流水
      const pHistory = db.history.add({
        date: split.date,
        hostname,
        path,
        startTime: split.startTime,
        duration: split.duration,
        title,
        eventSource,
      });

      // 2. L2 & L3: 准备读取 (Upsert Check)
      const siteKey: SiteKey = [split.date, hostname];
      const pSiteGet = db.sites.get(siteKey);

      const pageKey: PageKey = [split.date, hostname, path];
      const pPageGet = db.pages.get(pageKey);

      // 并行执行写入和读取
      // Optimization: Execute independent operations in parallel
      const [, siteStat, pageStat] = await Promise.all([pHistory, pSiteGet, pPageGet]);

      // 3. L2 & L3: 并行执行更新
      const pSiteUpdate = siteStat
        ? db.sites.update(siteKey, {
            duration: siteStat.duration + split.duration,
            lastVisit: Math.max(siteStat.lastVisit, split.startTime + split.duration),
          })
        : db.sites.add({
            date: split.date,
            hostname,
            duration: split.duration,
            lastVisit: split.startTime + split.duration,
          });

      const pPageUpdate = pageStat
        ? db.pages.update(pageKey, {
            duration: pageStat.duration + split.duration,
            title: title ?? pageStat.title,
          })
        : db.pages.add({
            date: split.date,
            hostname,
            path,
            fullPath,
            duration: split.duration,
            title,
          });

      await Promise.all([pSiteUpdate, pPageUpdate]);
    }
  });
}

/**
 * Aggregates site stats for a given date range.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param limit limit number of sites returned
 */
export async function getAggregatedSites(
  startDate: string,
  endDate: string,
  limit = 50,
): Promise<ISiteStat[]> {
  const map = new Map<string, ISiteStat>();

  await db.sites.where("date").between(startDate, endDate, true, true).each((r) => {
    const existing = map.get(r.hostname);
    if (existing) {
      existing.duration += r.duration;
      if (r.lastVisit > existing.lastVisit) {
        existing.lastVisit = r.lastVisit;
      }
    } else {
      map.set(r.hostname, { ...r });
    }
  });

  // Convert to array and sort
  return Array.from(map.values())
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);
}

/**
 * Gets daily total duration for the trend chart.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export async function getDailyTrend(
  startDate: string,
  endDate: string,
): Promise<{ date: string; duration: number }[]> {
  const dailyMap = new Map<string, number>();

  // Initialize all days in range with 0 (important for chart continuity)
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dailyMap.set(formatDate(current), 0);
    current = addDays(current, 1);
  }

  await db.sites.where("date").between(startDate, endDate, true, true).each((r) => {
    const currentVal = dailyMap.get(r.date) ?? 0;
    dailyMap.set(r.date, currentVal + r.duration);
  });

  return Array.from(dailyMap.entries())
    .map(([date, duration]) => ({ date, duration }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregates both site stats and daily trend in a single DB pass.
 * Optimization: Reduces IndexedDB iterations by 50% for non-day views.
 */
export async function getRangeStats(
  startDate: string,
  endDate: string,
  limit = 50,
): Promise<{
  sites: ISiteStat[];
  trend: { date: string; duration: number }[];
}> {
  const sitesMap = new Map<string, ISiteStat>();
  const dailyMap = new Map<string, number>();

  // Initialize all days in range with 0
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dailyMap.set(formatDate(current), 0);
    current = addDays(current, 1);
  }

  // Single pass over the data
  await db.sites.where("date").between(startDate, endDate, true, true).each((r) => {
    // Aggregate Sites
    const existingSite = sitesMap.get(r.hostname);
    if (existingSite) {
      existingSite.duration += r.duration;
      if (r.lastVisit > existingSite.lastVisit) {
        existingSite.lastVisit = r.lastVisit;
      }
    } else {
      sitesMap.set(r.hostname, { ...r });
    }

    // Aggregate Trend
    const currentVal = dailyMap.get(r.date) ?? 0;
    dailyMap.set(r.date, currentVal + r.duration);
  });

  // Process Sites
  const sites = Array.from(sitesMap.values())
    .sort((a, b) => b.duration - a.duration)
    .slice(0, limit);

  // Process Trend
  const trend = Array.from(dailyMap.entries())
    .map(([date, duration]) => ({ date, duration }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { sites, trend };
}

/**
 * Gets hourly trend for a specific date.
 * @param date YYYY-MM-DD
 */
export async function getHourlyTrend(date: string): Promise<{ hour: string; duration: number }[]> {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: i.toString(),
    duration: 0,
  }));

  const aggregated = await db.hourlyStats.where("date").equals(date).toArray();
  for (const s of aggregated) {
    if (s.hour >= 0 && s.hour < 24) {
      hours[s.hour].duration += s.duration;
    }
  }

  await db.history.where("date").equals(date).each((r) => {
    const d = new Date(r.startTime);
    const h = d.getHours();
    if (h >= 0 && h < 24) {
      hours[h].duration += r.duration;
    }
  });

  return hours;
}

/**
 * Aggregates page stats for a specific hostname within a date range.
 * @param hostname
 * @param startDate
 * @param endDate
 */
export async function getAggregatedPages(
  hostname: string,
  startDate: string,
  endDate: string,
): Promise<IPageStat[]> {
  // We can't easily use [date+hostname+path] for range query on date while filtering hostname.
  // Index is [date+hostname+path].
  // We can use [date+hostname] index to filter first.

  const start = parseDate(startDate);
  const end = parseDate(endDate);
  const promises: Promise<IPageStat[]>[] = [];

  let current = start;
  while (current <= end) {
    const dayStr = formatDate(current);
    // Query pages for this specific day and hostname
    promises.push(db.pages.where("[date+hostname]").equals([dayStr, hostname]).toArray());
    current = addDays(current, 1);
  }

  const dayArrays = await Promise.all(promises);
  const allPages = dayArrays.flat();

  // Aggregate
  const map = new Map<string, IPageStat>();

  for (const p of allPages) {
    const existing = map.get(p.path);
    if (existing) {
      existing.duration += p.duration;
      // update title if newer one is better? just keep one.
    } else {
      map.set(p.path, { ...p });
    }
  }

  return Array.from(map.values()).sort((a, b) => b.duration - a.duration);
}

/**
 * Gets history logs with optional filtering.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param hostname Optional hostname filter
 * @param path Optional path filter (requires hostname)
 */
export async function getHistoryLogs(
  startDate: string,
  endDate: string,
  hostname?: string,
  path?: string,
  limit = 2000,
): Promise<IHistoryLog[]> {
  let records: IHistoryLog[] = [];

  if (hostname) {
    // Collect all dates to query upfront
    const start = parseDate(startDate);
    const end = parseDate(endDate);

    const dates: string[] = [];
    let current = end;
    while (current >= start && dates.length < 200) {
      // Reasonable limit to prevent too many queries
      dates.push(formatDate(current));
      current = addDays(current, -1);
    }

    // Query all dates in parallel
    const dayResults = await Promise.all(
      dates.map((dayStr) =>
        db.history.where("[date+hostname]").equals([dayStr, hostname]).toArray(),
      ),
    );

    // Process results in date order (most recent first)
    for (const dayRecords of dayResults) {
      // Sort day records descending
      dayRecords.sort((a, b) => b.startTime - a.startTime);

      // Filter path if needed
      const filtered = path ? dayRecords.filter((r) => r.path === path) : dayRecords;

      records.push(...filtered);

      if (records.length >= limit) break;
    }

    return records.slice(0, limit);
  } else {
    // Global history: use startTime index for efficiency
    const startTs = parseDate(startDate).getTime();
    const endTs = addDays(parseDate(endDate), 1).getTime() - 1;

    records = await db.history
      .where("startTime")
      .between(startTs, endTs, true, true)
      .reverse()
      .limit(limit)
      .toArray();

    // Filter by path (unlikely for global view but supported)
    if (path) {
      records = records.filter((r) => r.path === path);
    }
    return records;
  }
}

/**
 * 获取今日站点排行榜 (用于 Dashboard) - Legacy wrapper
 * @param limit 显示多少条，默认 10
 */
export function getTodayTopSites(limit = 10) {
  const today = getTodayStr();
  return getAggregatedSites(today, today, limit);
}

/**
 * 获取某站点今日的页面访问详情 (用于下钻页面) - Legacy wrapper
 * @param hostname 主机名 (如 developer.chrome.com)
 */
export function getSitePagesDetail(hostname: string) {
  const today = getTodayStr();
  return getAggregatedPages(hostname, today, today);
}

/**
 * Deletes all data (history, sites, pages) for a given hostname.
 */
export async function deleteSiteData(hostname: string): Promise<void> {
  await db.transaction("rw", db.history, db.sites, db.pages, async () => {
    const historyKeys = await db.history
      .filter((h) => h.hostname === hostname)
      .primaryKeys();
    const pageKeys = await db.pages
      .filter((p) => p.hostname === hostname)
      .primaryKeys();
    await Promise.all([
      historyKeys.length > 0 ? db.history.bulkDelete(historyKeys) : Promise.resolve(),
      db.sites.where("hostname").equals(hostname).delete(),
      pageKeys.length > 0 ? db.pages.bulkDelete(pageKeys) : Promise.resolve(),
    ]);
  });
}
