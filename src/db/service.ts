// oxlint-disable no-array-reverse
// oxlint-disable max-lines-per-function
import { db } from "./index";
import type { SiteKey, PageKey } from "./types";
import { normalizeUrl, getTodayStr } from "./utils";

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
 * 获取今日站点排行榜 (用于 Dashboard)
 * @param limit 显示多少条，默认 10
 */
export function getTodayTopSites(limit = 10) {
  const today = getTodayStr();

  // 利用 IndexedDB 索引直接排序，性能极快
  return db.sites
    .where("date")
    .equals(today)
    .sortBy("duration")
    .then((list) => list.reverse().slice(0, limit));
}

/**
 * 获取某站点今日的页面访问详情 (用于下钻页面)
 * @param domain 根域名 (如 google.com)
 */
export function getSitePagesDetail(domain: string) {
  const today = getTodayStr();

  // 利用 [date+domain] 复合索引前缀查询
  return db.pages
    .where("[date+domain]")
    .equals([today, domain])
    .sortBy("duration")
    .then((list) => list.reverse());
}
