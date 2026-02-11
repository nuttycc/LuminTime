import { beforeEach, describe, expect, it, vi } from "vitest";
import { exportAllData, importData } from "../../src/db/exportImport";

const {
  mockHistoryBulkPut,
  mockHistoryToArray,
  mockPagesBulkPut,
  mockPagesToArray,
  mockSitesBulkPut,
  mockSitesToArray,
} = vi.hoisted(() => ({
  mockHistoryBulkPut: vi.fn(),
  mockHistoryToArray: vi.fn(),
  mockPagesBulkPut: vi.fn(),
  mockPagesToArray: vi.fn(),
  mockSitesBulkPut: vi.fn(),
  mockSitesToArray: vi.fn(),
}));

vi.mock("../../src/db/index", () => ({
  db: {
    transaction: vi.fn((_mode: string, _tables: unknown, callback: () => void) => callback()),
    history: { toArray: mockHistoryToArray, bulkPut: mockHistoryBulkPut },
    pages: { toArray: mockPagesToArray, bulkPut: mockPagesBulkPut },
    sites: { toArray: mockSitesToArray, bulkPut: mockSitesBulkPut },
  },
}));

describe("exportImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("exportAllData", () => {
    it("should export data from all tables", async () => {
      const mockHistoryData = [{ date: "2023-01-01", id: 1 }];
      const mockSitesData = [{ hostname: "example.com" }];
      const mockPagesData = [{ path: "/test" }];

      mockHistoryToArray.mockResolvedValue(mockHistoryData);
      mockSitesToArray.mockResolvedValue(mockSitesData);
      mockPagesToArray.mockResolvedValue(mockPagesData);

      const result = await exportAllData();

      expect(result.history).toEqual(mockHistoryData);
      expect(result.sites).toEqual(mockSitesData);
      expect(result.pages).toEqual(mockPagesData);
      expect(result.version).toBe(1);
      expect(result.exportedAt).toBeDefined();
    });
  });

  describe("importData", () => {
    it("should import data into all tables", async () => {
      const importPayload = {
        version: 1,
        exportedAt: "2023-01-01T00:00:00.000Z",
        history: [{ id: 1, date: "2023-01-01" }] as never[],
        sites: [{ hostname: "example.com" }] as never[],
        pages: [{ path: "/test" }] as never[],
      };

      await importData(importPayload);

      expect(mockHistoryBulkPut).toHaveBeenCalledWith(importPayload.history);
      expect(mockSitesBulkPut).toHaveBeenCalledWith(importPayload.sites);
      expect(mockPagesBulkPut).toHaveBeenCalledWith(importPayload.pages);
    });

    it("should throw error for invalid data structure", async () => {
      const invalidPayload = { version: 1 } as never;
      await expect(importData(invalidPayload)).rejects.toThrow("Invalid data structure");
    });
  });
});
