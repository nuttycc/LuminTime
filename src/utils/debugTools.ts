import { db } from "@/db";
import { getTodayTopSites } from "@/db/service";
import { getTodayStr } from "@/db/utils";

export const debugTools = {
  async stats() {
    const today = getTodayStr();
    const historyCount = await db.history.where("date").equals(today).count();
    const sitesCount = await db.sites.where("date").equals(today).count();
    const pagesCount = await db.pages.where("date").equals(today).count();
    console.log(`📊 今日统计: 历史${historyCount}条, 站点${sitesCount}个, 页面${pagesCount}个`);
    return { historyCount, sitesCount, pagesCount };
  },
  async topSites(limit = 10) {
    const sites = await getTodayTopSites(limit);
    console.table(
      sites.map((s) => ({
        domain: s.domain,
        duration: `${(s.duration / 1000 / 60).toFixed(2)}分`,
        lastVisit: new Date(s.lastVisit).toLocaleTimeString(),
      })),
    );
    return sites;
  },
  async clear() {
    const today = getTodayStr();
    await db.transaction("rw", db.history, db.sites, db.pages, async () => {
      await db.history.where("date").equals(today).delete();
      await db.sites.where("date").equals(today).delete();
      await db.pages.where("date").equals(today).delete();
    });
    console.log("✓ 已清空今日数据");
  },
  raw: {
    async history() {
      const today = getTodayStr();
      const data = await db.history.where("date").equals(today).toArray();
      console.log(`📋 原始历史表 (${data.length}条):`);
      console.table(data);
      return data;
    },
    async sites() {
      const today = getTodayStr();
      const data = await db.sites.where("date").equals(today).toArray();
      console.log(`📋 原始站点表 (${data.length}个):`);
      console.table(data);
      return data;
    },
    async pages() {
      const today = getTodayStr();
      const data = await db.pages.where("date").equals(today).toArray();
      console.log(`📋 原始页面表 (${data.length}个):`);
      console.table(data);
      return data;
    },
  },
};
