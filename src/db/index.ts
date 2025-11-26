import { Dexie, type Table } from "dexie";
import type { IHistoryLog, ISiteStat, IPageStat } from "./types";

export class LuminTimeDB extends Dexie {
  // 声明表及其类型
  history!: Table<IHistoryLog>;
  sites!: Table<ISiteStat>;
  pages!: Table<IPageStat>;

  constructor() {
    super("LuminTimeDB");

    this.version(1).stores({
      // L1: 原始流水
      // 索引: date (按天删), [date+domain] (按天查某站流水)
      history: "++id, date, [date+domain], startTime",

      // L2: 站点概览
      // 主键: [date+domain] 确保每天每个根域名只有一条
      // 索引: duration (用于排行榜排序)
      sites: "[date+domain], date, domain, duration",

      // L3: 页面详情
      // 主键: [date+domain+path] 确保每天每个根域名的每个路径只有一条
      // 索引: [date+domain] (用于快速查找某站下的所有页面)
      pages: "[date+domain+path], date, [date+domain], duration",
    });
  }
}

export const db = new LuminTimeDB();
