import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { EventSource } from "../../src/db/types";
import { recordActivity } from "../../src/db/service";

interface HistoryRow {
  date: string;
  hostname: string;
  path: string;
  startTime: number;
  duration: number;
  title?: string;
  eventSource?: EventSource;
}

interface SiteRow {
  date: string;
  hostname: string;
  duration: number;
  lastVisit: number;
}

interface PageRow {
  date: string;
  hostname: string;
  path: string;
  fullPath: string;
  duration: number;
  title?: string;
}

type SiteKey = [date: string, hostname: string];
type PageKey = [date: string, hostname: string, path: string];

const dbState = vi.hoisted(() => ({
  historyRows: [] as HistoryRow[],
  pageRows: [] as PageRow[],
  siteRows: [] as SiteRow[],
}));

vi.mock("../../src/db/index", () => {
  const findSite = ([date, hostname]: SiteKey) =>
    dbState.siteRows.find((row) => row.date === date && row.hostname === hostname);

  const findPage = ([date, hostname, path]: PageKey) =>
    dbState.pageRows.find(
      (row) => row.date === date && row.hostname === hostname && row.path === path,
    );

  return {
    db: {
      transaction: vi.fn(async (_mode: string, ...args: unknown[]) => {
        const callback = args[args.length - 1] as () => Promise<void>;
        await callback();
      }),
      history: {
        add: vi.fn(async (row: HistoryRow) => {
          dbState.historyRows.push({ ...row });
        }),
      },
      sites: {
        get: vi.fn(async (key: SiteKey) => findSite(key)),
        update: vi.fn(async (key: SiteKey, changes: Partial<SiteRow>) => {
          const site = findSite(key);
          if (site) Object.assign(site, changes);
        }),
        add: vi.fn(async (row: SiteRow) => {
          dbState.siteRows.push({ ...row });
        }),
      },
      pages: {
        get: vi.fn(async (key: PageKey) => findPage(key)),
        update: vi.fn(async (key: PageKey, changes: Partial<PageRow>) => {
          const page = findPage(key);
          if (page) Object.assign(page, changes);
        }),
        add: vi.fn(async (row: PageRow) => {
          dbState.pageRows.push({ ...row });
        }),
      },
    },
  };
});

const totalDuration = (rows: Array<{ duration: number }>) =>
  rows.reduce((sum, row) => sum + row.duration, 0);

describe("recordActivity", () => {
  const START_TIME = new Date(2025, 0, 15, 9, 30, 0).getTime();

  beforeEach(() => {
    vi.clearAllMocks();
    dbState.historyRows.length = 0;
    dbState.pageRows.length = 0;
    dbState.siteRows.length = 0;
  });

  it("writes matching duration to history, site, and page tables", async () => {
    await recordActivity("https://example.com/docs", 10_000, "Docs", START_TIME, "navigation");

    expect(dbState.historyRows).toEqual([
      {
        date: "2025-01-15",
        hostname: "example.com",
        path: "/docs",
        startTime: START_TIME,
        duration: 10_000,
        title: "Docs",
        eventSource: "navigation",
      },
    ]);
    expect(dbState.siteRows).toEqual([
      {
        date: "2025-01-15",
        hostname: "example.com",
        duration: 10_000,
        lastVisit: START_TIME + 10_000,
      },
    ]);
    expect(dbState.pageRows).toEqual([
      {
        date: "2025-01-15",
        hostname: "example.com",
        path: "/docs",
        fullPath: "https://example.com/docs",
        duration: 10_000,
        title: "Docs",
      },
    ]);
    expect(totalDuration(dbState.historyRows)).toBe(totalDuration(dbState.siteRows));
    expect(totalDuration(dbState.pageRows)).toBe(totalDuration(dbState.siteRows));
  });

  it("accumulates repeated visits for the same site and page", async () => {
    await recordActivity("https://example.com/docs", 10_000, "Old Docs", START_TIME);
    await recordActivity("https://example.com/blog", 20_000, "Blog", START_TIME + 20_000);
    await recordActivity("https://example.com/docs", 15_000, "New Docs", START_TIME + 50_000);

    const docsPage = dbState.pageRows.find((row) => row.path === "/docs");
    const blogPage = dbState.pageRows.find((row) => row.path === "/blog");

    expect(dbState.siteRows).toHaveLength(1);
    expect(dbState.siteRows[0]?.duration).toBe(45_000);
    expect(dbState.siteRows[0]?.lastVisit).toBe(START_TIME + 65_000);
    expect(docsPage?.duration).toBe(25_000);
    expect(docsPage?.title).toBe("New Docs");
    expect(blogPage?.duration).toBe(20_000);
    expect(totalDuration(dbState.historyRows)).toBe(45_000);
    expect(totalDuration(dbState.pageRows)).toBe(dbState.siteRows[0]?.duration);
  });

  it("does not write rows for non-web urls", async () => {
    await recordActivity("chrome://extensions", 10_000, "Extensions", START_TIME);
    await recordActivity("file:///Users/test/report.txt", 20_000, "Local File", START_TIME);

    expect(dbState.historyRows).toEqual([]);
    expect(dbState.siteRows).toEqual([]);
    expect(dbState.pageRows).toEqual([]);
  });
});
