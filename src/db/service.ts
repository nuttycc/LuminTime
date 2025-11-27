// oxlint-disable no-array-reverse
// oxlint-disable max-lines-per-function
import { db } from "./index";
import type { SiteKey, PageKey, ISiteStat, IPageStat } from "./types";
import { normalizeUrl, getTodayStr } from "./utils";
import { addDays, formatDate, parseDate } from "@/utils/dateUtils";

/**
 * 核心写入方法：原子性更新三层数据
 * @param rawUrl 原始 URL
 * @param durationToAdd 增加的时长 (毫秒)
 * @param title 网页标题 (可选)
 */
export async function recordActivity(rawUrl: string, durationToAdd: number, title?: string) {
  if (!rawUrl || durationToAdd <= 0) return;

  // 忽略非 http/https 协议 (如 chrome://, about:)
  if (!rawUrl.startsWith("http")) return;

  const { domain, subdomain, path, fullPath } = normalizeUrl(rawUrl);
  const today = getTodayStr();
  const now = Date.now();

  // Transaction: 只要有一个失败，全部回滚。确保数据一致性。
  await db.transaction("rw", db.history, db.sites, db.pages, async () => {
    // 1. L1: 插入流水 (总是新增)
    await db.history.add({
      date: today,
      domain,
      subdomain,
      path,
      startTime: now - durationToAdd,
      duration: durationToAdd,
      title,
    });

    // 2. L2: 更新站点概览 (Upsert)
    // 复合主键必须以数组形式传递
    const siteKey: SiteKey = [today, domain];
    const siteStat = await db.sites.get(siteKey);

    if (siteStat) {
      await db.sites.update(siteKey, {
        duration: siteStat.duration + durationToAdd,
        lastVisit: now,
      });
    } else {
      await db.sites.add({
        date: today,
        domain,
        duration: durationToAdd,
        lastVisit: now,
        // iconUrl: 这里后续可以加获取 favicon 的逻辑
      });
    }

    // 3. L3: 更新页面详情 (Upsert)
    const pageKey: PageKey = [today, domain, path];
    const pageStat = await db.pages.get(pageKey);

    if (pageStat) {
      await db.pages.update(pageKey, {
        duration: pageStat.duration + durationToAdd,
        title: title ?? pageStat.title, // 优先更新为最新的标题
      });
    } else {
      await db.pages.add({
        date: today,
        domain,
        path,
        fullPath, // 存储完整路径供展示
        duration: durationToAdd,
        title,
      });
    }
  });
}

/**
 * Aggregates site stats for a given date range.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 * @param limit limit number of sites returned
 */
export async function getAggregatedSites(startDate: string, endDate: string, limit = 50): Promise<ISiteStat[]> {
  // If same day, use the optimized daily query if possible, or just use range
  // Range query: date between startDate and endDate
  const records = await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .toArray();

  // Aggregate in memory
  const map = new Map<string, ISiteStat>();

  for (const r of records) {
    const existing = map.get(r.domain);
    if (existing) {
      existing.duration += r.duration;
      // keep the latest visit
      if (r.lastVisit > existing.lastVisit) {
        existing.lastVisit = r.lastVisit;
      }
      // keep iconUrl if missing? (assuming it might be populated later)
    } else {
      // Clone to avoid mutating DB object if Dexie caches it
      map.set(r.domain, { ...r });
    }
  }

  // Convert to array and sort
  const result = Array.from(map.values()).slice().sort((a, b) => b.duration - a.duration);
  return result.slice(0, limit);
}

/**
 * Gets daily total duration for the trend chart.
 * @param startDate YYYY-MM-DD
 * @param endDate YYYY-MM-DD
 */
export async function getDailyTrend(startDate: string, endDate: string): Promise<{ date: string; duration: number }[]> {
  const records = await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .toArray();

  const dailyMap = new Map<string, number>();

  // Initialize all days in range with 0 (important for chart continuity)
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dailyMap.set(formatDate(current), 0);
    current = addDays(current, 1);
  }

  for (const r of records) {
    const currentVal = dailyMap.get(r.date) ?? 0;
    dailyMap.set(r.date, currentVal + r.duration);
  }

  return Array.from(dailyMap.entries())
    .map(([date, duration]) => ({ date, duration }))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Aggregates page stats for a specific domain within a date range.
 * @param domain
 * @param startDate
 * @param endDate
 */
export async function getAggregatedPages(domain: string, startDate: string, endDate: string): Promise<IPageStat[]> {
    // We can't easily use [date+domain+path] for range query on date while filtering domain.
    // Index is [date+domain+path].
    // We can use [date+domain] index to filter first.

    // Dexie compound index usage:
    // We want all records where date is in range AND domain is X.
    // The index is `[date+domain+path]` or `[date+domain]`.
    // We can use `.where('[date+domain]').between([startDate, domain], [endDate, domain])`
    // BUT this only works if domain is the significant part, which it is NOT here (date is first).
    // Actually, `between` on compound index compares lexicographically.
    // [startDate, domain] ... [endDate, domain] includes [startDate, domain+1] which is wrong.

    // Better strategy: Filter by date range first, then filter by domain in memory?
    // OR use the `[date+domain]` index but we have to be careful.
    // Actually, if we iterate all days in range, we can query specific keys: [day, domain].
    // If the range is small (e.g. 30 days), 30 queries is fast.

    // Let's try the iterate approach for exactness and performance on indexed lookups.
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    const promises: Promise<IPageStat[]>[] = [];

    let current = start;
    while (current <= end) {
      const dayStr = formatDate(current);
      // Query pages for this specific day and domain
      promises.push(
        db.pages.where('[date+domain]').equals([dayStr, domain]).toArray()
      );
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

    return Array.from(map.values()).slice().sort((a, b) => b.duration - a.duration);
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
 * @param domain 根域名 (如 google.com)
 */
export function getSitePagesDetail(domain: string) {
  const today = getTodayStr();
  return getAggregatedPages(domain, today, today);
}
