import { type } from "arktype";

// 事件来源类型
export type EventSource = "tab_activated" | "navigation" | "window_focus" | "idle_resume" | "alarm";

// --- L1: 原始流水 (用于历史回溯/审计) ---
export const HistoryLog = type({
  "id?": "number", // Dexie 自增主键
  date: "string", // YYYY-MM-DD
  hostname: "string", // 主机名 (例如 developer.chrome.com)
  path: "string", // 路径+参数 (/search?q=...)
  startTime: "number",
  duration: "number", // 毫秒
  "title?": "string",
  "eventSource?": "'tab_activated' | 'navigation' | 'window_focus' | 'idle_resume' | 'alarm'",
});
export type IHistoryLog = typeof HistoryLog.infer;

// --- L2: 站点概览 (用于首页 Dashboard) ---
export const SiteStat = type({
  hostname: "string", // [date+hostname] 主键一部分
  date: "string",
  duration: "number",
  lastVisit: "number",
  "iconUrl?": "string",
});
export type ISiteStat = typeof SiteStat.infer;

// --- L3: 页面详情 (用于下钻分析) ---
export const PageStat = type({
  path: "string", // [date+hostname+path] 主键一部分
  hostname: "string", // 主机名
  date: "string",
  fullPath: "string", // 完整URL用于展示
  duration: "number",
  "title?": "string",
});
export type IPageStat = typeof PageStat.infer;

// 复合主键类型定义
export type SiteKey = [date: string, hostname: string];
export type PageKey = [date: string, hostname: string, path: string];

// --- L1.5: 小时聚合 (用于趋势图, 由 retention job 生成) ---
export const HourlyStat = type({
  date: "string",
  hour: "number",
  duration: "number",
});
export type IHourlyStat = typeof HourlyStat.infer;

export type HourKey = [date: string, hour: number];
