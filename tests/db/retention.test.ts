import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  aggregateOneDay,
  getRawRetentionDays,
  runRetentionJob,
  setRawRetentionDays,
} from "../../src/db/retention";

interface HistoryRecord {
  startTime: number;
  duration: number;
}

const {
  mockHistoryDelete,
  mockHistoryOrderBy,
  mockHistoryWhere,
  mockHourlyStatsBulkPut,
  mockHourlyStatsWhere,
  mockMetaGet,
  mockMetaPut,
} = vi.hoisted(() => ({
  mockHistoryDelete: vi.fn(),
  mockHistoryOrderBy: vi.fn(),
  mockHistoryWhere: vi.fn(),
  mockHourlyStatsBulkPut: vi.fn(),
  mockHourlyStatsWhere: vi.fn(),
  mockMetaGet: vi.fn(),
  mockMetaPut: vi.fn(),
}));

const mockHourlyStatsDelete = vi.fn();

function mockHistoryRows(records: HistoryRecord[]): void {
  mockHistoryWhere.mockReturnValue({
    equals: vi.fn().mockReturnValue({
      each: vi.fn(async (callback: (record: HistoryRecord) => void) => {
        for (const record of records) {
          callback(record);
        }
      }),
      delete: mockHistoryDelete,
    }),
  });
}

function mockEmptyHistoryRows(): void {
  mockHistoryWhere.mockReturnValue({
    equals: vi.fn().mockReturnValue({
      each: vi.fn(async () => {}),
      delete: mockHistoryDelete,
    }),
  });
}

vi.mock("../../src/db/index", () => ({
  db: {
    transaction: vi.fn((_mode: string, ...args: unknown[]) => {
      const callback = args[args.length - 1] as () => Promise<void>;
      return callback();
    }),
    history: {
      where: mockHistoryWhere,
      orderBy: mockHistoryOrderBy,
    },
    hourlyStats: {
      bulkPut: mockHourlyStatsBulkPut,
      where: mockHourlyStatsWhere,
    },
    meta: {
      get: mockMetaGet,
      put: mockMetaPut,
    },
  },
}));

vi.mock("../../src/db/utils", () => ({
  getTodayStr: () => "2025-06-15",
}));

describe("retention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHourlyStatsWhere.mockReturnValue({
      equals: vi.fn().mockReturnValue({
        delete: mockHourlyStatsDelete,
      }),
    });
  });

  describe("getRawRetentionDays", () => {
    it("returns default 7 when meta has no record", async () => {
      mockMetaGet.mockResolvedValue(undefined);

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
      expect(mockMetaGet).toHaveBeenCalledWith("retention.rawDays");
    });

    it("returns stored value when meta has record", async () => {
      mockMetaGet.mockResolvedValue({ key: "retention.rawDays", value: 14 });

      const result = await getRawRetentionDays();

      expect(result).toBe(14);
    });

    it("returns default when stored value is below minimum", async () => {
      mockMetaGet.mockResolvedValue({ key: "retention.rawDays", value: 0 });

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
    });

    it("returns default when stored value is negative", async () => {
      mockMetaGet.mockResolvedValue({ key: "retention.rawDays", value: -5 });

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
    });
  });

  describe("setRawRetentionDays", () => {
    it("calls meta.put with correct key/value", async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(30);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: "retention.rawDays", value: 30 });
    });

    it("clamps value to minimum of 1", async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(0);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: "retention.rawDays", value: 1 });
    });

    it("clamps negative value to minimum of 1", async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(-10);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: "retention.rawDays", value: 1 });
    });

    it("rounds fractional days", async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(7.6);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: "retention.rawDays", value: 8 });
    });
  });

  describe("aggregateOneDay", () => {
    it("aggregates history records into hourly buckets and deletes history", async () => {
      mockHistoryRows([
        { startTime: new Date(2025, 0, 10, 9, 30).getTime(), duration: 60000 },
        { startTime: new Date(2025, 0, 10, 9, 45).getTime(), duration: 30000 },
        { startTime: new Date(2025, 0, 10, 14, 0).getTime(), duration: 120000 },
      ]);

      await aggregateOneDay("2025-01-10");

      expect(mockHourlyStatsDelete).toHaveBeenCalled();
      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([
        { date: "2025-01-10", hour: 9, duration: 90000 },
        { date: "2025-01-10", hour: 14, duration: 120000 },
      ]);
      expect(mockHistoryDelete).toHaveBeenCalled();
    });

    it("only writes non-zero hours", async () => {
      mockHistoryRows([{ startTime: new Date(2025, 0, 10, 5, 0).getTime(), duration: 10000 }]);

      await aggregateOneDay("2025-01-10");

      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([
        { date: "2025-01-10", hour: 5, duration: 10000 },
      ]);
    });

    it("clears existing hourly stats before writing (idempotency)", async () => {
      mockEmptyHistoryRows();

      await aggregateOneDay("2025-01-10");

      expect(mockHourlyStatsDelete).toHaveBeenCalled();
      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([]);
    });
  });

  describe("runRetentionJob", () => {
    it("processes eligible days and stops at cutoff", async () => {
      mockMetaGet.mockResolvedValue({ key: "retention.rawDays", value: 7 });

      const mockFirst = vi
        .fn()
        .mockResolvedValueOnce({ date: "2025-06-05" })
        .mockResolvedValueOnce({ date: "2025-06-07" })
        .mockResolvedValueOnce({ date: "2025-06-09" });

      mockHistoryOrderBy.mockReturnValue({ first: mockFirst });
      mockEmptyHistoryRows();

      await runRetentionJob();

      expect(mockFirst).toHaveBeenCalledTimes(3);
    });

    it("does nothing when no old history exists", async () => {
      mockMetaGet.mockResolvedValue({ key: "retention.rawDays", value: 7 });
      mockHistoryOrderBy.mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      });

      await runRetentionJob();

      expect(mockHistoryWhere).not.toHaveBeenCalled();
    });
  });
});
