import { type } from 'arktype';

// --- L1: 原始流水 (用于历史回溯/审计) ---
export const HistoryLog = type({
  "id?": "number", // Dexie 自增主键
  date: "string",  // YYYY-MM-DD
  domain: "string", // 根域名 (google.com)
  subdomain: "string", // 子域名 (mail.google.com)
  path: "string",   // 路径+参数 (/search?q=...)
  startTime: "number",
  duration: "number", // 毫秒
  "title?": "string"
});
export type IHistoryLog = typeof HistoryLog.infer;

// --- L2: 站点概览 (用于首页 Dashboard) ---
export const SiteStat = type({
  domain: "string", // [date+domain] 主键一部分
  date: "string",
  duration: "number",
  visitCount: "number",
  lastVisit: "number",
  "iconUrl?": "string"
});
export type ISiteStat = typeof SiteStat.infer;

// --- L3: 页面详情 (用于下钻分析) ---
export const PageStat = type({
  path: "string",   // [date+domain+path] 主键一部分
  domain: "string", // 根域名
  date: "string",
  fullPath: "string", // 完整URL用于展示
  duration: "number",
  visitCount: "number",
  "title?": "string"
});
export type IPageStat = typeof PageStat.infer;

// 复合主键类型定义
export type SiteKey = [date: string, domain: string];
export type PageKey = [date: string, domain: string, path: string];
