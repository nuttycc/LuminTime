import { db } from "./index";
import type { ISiteStat } from "./types";
import { addDays, formatDate, parseDate } from "@/utils/dateUtils";

export interface SiteComparison {
  hostname: string;
  thisWeek: number;
  lastWeek: number;
  changePercent: number;
}

export interface WeeklyInsights {
  thisWeekTotal: number;
  lastWeekTotal: number;
  changePercent: number;
  dailyTrend: { date: string; duration: number }[];
  heatmap: number[][];
  topSitesComparison: SiteComparison[];
}

async function getDateRangeTotal(startDate: string, endDate: string): Promise<number> {
  let total = 0;

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      total += record.duration;
    });

  return total;
}

async function getDailyTrendForRange(
  startDate: string,
  endDate: string,
): Promise<{ date: string; duration: number }[]> {
  const dailyMap = new Map<string, number>();
  let current = parseDate(startDate);
  const end = parseDate(endDate);

  while (current <= end) {
    dailyMap.set(formatDate(current), 0);
    current = addDays(current, 1);
  }

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      const prev = dailyMap.get(record.date) ?? 0;
      dailyMap.set(record.date, prev + record.duration);
    });

  return Array.from(dailyMap.entries())
    .map(([date, duration]) => ({ date, duration }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function getHeatmapForWeek(startDate: string, endDate: string): Promise<number[][]> {
  // 7 days × 24 hours matrix
  const matrix: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
  const weekStart = parseDate(startDate);

  // Map date string to day index (0=Mon, 6=Sun)
  const dateToDay = new Map<string, number>();
  for (let i = 0; i < 7; i++) {
    dateToDay.set(formatDate(addDays(weekStart, i)), i);
  }

  // From hourlyStats (aggregated by retention job)
  await db.hourlyStats
    .where("date")
    .between(startDate, endDate, true, true)
    .each((stat) => {
      const dayIdx = dateToDay.get(stat.date);
      if (dayIdx !== undefined && stat.hour >= 0 && stat.hour < 24) {
        matrix[dayIdx][stat.hour] += stat.duration;
      }
    });

  // From history (for recent data not yet aggregated)
  await db.history
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      const dayIdx = dateToDay.get(record.date);
      if (dayIdx !== undefined) {
        const hour = new Date(record.startTime).getHours();
        if (hour >= 0 && hour < 24) {
          matrix[dayIdx][hour] += record.duration;
        }
      }
    });

  return matrix;
}

async function getTopSitesForRange(
  startDate: string,
  endDate: string,
  limit?: number,
): Promise<Map<string, ISiteStat>> {
  const siteMap = new Map<string, ISiteStat>();

  await db.sites
    .where("date")
    .between(startDate, endDate, true, true)
    .each((record) => {
      const existing = siteMap.get(record.hostname);
      if (!existing) {
        siteMap.set(record.hostname, { ...record });
      } else {
        existing.duration += record.duration;
        if (record.lastVisit > existing.lastVisit) {
          existing.lastVisit = record.lastVisit;
          existing.iconUrl = record.iconUrl;
        }
      }
    });

  // Sort and keep top N (if limit specified)
  const sorted = Array.from(siteMap.entries()).sort((a, b) => b[1].duration - a[1].duration);

  return new Map(limit ? sorted.slice(0, limit) : sorted);
}

export async function getWeeklyInsights(
  thisWeekStart: string,
  thisWeekEnd: string,
): Promise<WeeklyInsights> {
  const lastWeekStart = formatDate(addDays(parseDate(thisWeekStart), -7));
  const lastWeekEnd = formatDate(addDays(parseDate(thisWeekEnd), -7));

  const [thisWeekTotal, lastWeekTotal, dailyTrend, heatmap, thisWeekSites, lastWeekSites] =
    await Promise.all([
      getDateRangeTotal(thisWeekStart, thisWeekEnd),
      getDateRangeTotal(lastWeekStart, lastWeekEnd),
      getDailyTrendForRange(thisWeekStart, thisWeekEnd),
      getHeatmapForWeek(thisWeekStart, thisWeekEnd),
      getTopSitesForRange(thisWeekStart, thisWeekEnd, 5),
      getTopSitesForRange(lastWeekStart, lastWeekEnd),
    ]);

  const changePercent =
    lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;

  // Build site comparison from union of top 5 this week hostnames
  const topSitesComparison: SiteComparison[] = [];
  for (const [hostname, site] of thisWeekSites) {
    const lastWeekSite = lastWeekSites.get(hostname);
    const lastWeekDuration = lastWeekSite?.duration ?? 0;
    const siteChange =
      lastWeekDuration > 0 ? ((site.duration - lastWeekDuration) / lastWeekDuration) * 100 : 0;

    topSitesComparison.push({
      hostname,
      thisWeek: site.duration,
      lastWeek: lastWeekDuration,
      changePercent: siteChange,
    });
  }

  return {
    thisWeekTotal,
    lastWeekTotal,
    changePercent,
    dailyTrend,
    heatmap,
    topSitesComparison,
  };
}
