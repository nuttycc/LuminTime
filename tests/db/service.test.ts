import { beforeEach, describe, expect, it, vi } from "vitest";
import { getAggregatedPages } from "../../src/db/service";

const { mockPagesWhere } = vi.hoisted(() => ({
  mockPagesWhere: vi.fn(),
}));

vi.mock("../../src/db/index", () => ({
  db: {
    pages: {
      where: mockPagesWhere,
    },
  },
}));

interface PageRow {
  date: string;
  hostname: string;
  path: string;
  fullPath: string;
  duration: number;
  title?: string;
}

describe("getAggregatedPages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates page title from later records during aggregation", async () => {
    const rowsByDate = new Map<string, PageRow[]>([
      [
        "2025-01-01",
        [
          {
            date: "2025-01-01",
            hostname: "example.com",
            path: "/docs",
            fullPath: "https://example.com/docs",
            duration: 60_000,
            title: "Old title",
          },
        ],
      ],
      [
        "2025-01-02",
        [
          {
            date: "2025-01-02",
            hostname: "example.com",
            path: "/docs",
            fullPath: "https://example.com/docs",
            duration: 90_000,
            title: "New title",
          },
        ],
      ],
    ]);

    mockPagesWhere.mockImplementation((indexName: string) => {
      expect(indexName).toBe("[date+hostname]");
      return {
        equals: ([date, hostname]: [string, string]) => ({
          toArray: async () =>
            rowsByDate.get(date)?.filter((row) => row.hostname === hostname) ?? [],
        }),
      };
    });

    const pages = await getAggregatedPages("example.com", "2025-01-01", "2025-01-02");

    expect(pages).toHaveLength(1);
    expect(pages[0]?.duration).toBe(150_000);
    expect(pages[0]?.title).toBe("New title");
  });

  it("keeps existing title when later record has no title", async () => {
    const rowsByDate = new Map<string, PageRow[]>([
      [
        "2025-01-01",
        [
          {
            date: "2025-01-01",
            hostname: "example.com",
            path: "/guide",
            fullPath: "https://example.com/guide",
            duration: 30_000,
            title: "Stable title",
          },
        ],
      ],
      [
        "2025-01-02",
        [
          {
            date: "2025-01-02",
            hostname: "example.com",
            path: "/guide",
            fullPath: "https://example.com/guide",
            duration: 20_000,
          },
        ],
      ],
    ]);

    mockPagesWhere.mockImplementation(() => ({
      equals: ([date, hostname]: [string, string]) => ({
        toArray: async () => rowsByDate.get(date)?.filter((row) => row.hostname === hostname) ?? [],
      }),
    }));

    const pages = await getAggregatedPages("example.com", "2025-01-01", "2025-01-02");

    expect(pages).toHaveLength(1);
    expect(pages[0]?.duration).toBe(50_000);
    expect(pages[0]?.title).toBe("Stable title");
  });
});
