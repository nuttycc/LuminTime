import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRawRetentionDays, setRawRetentionDays, aggregateOneDay, runRetentionJob } from '../../src/db/retention';

const { mockMetaGet, mockMetaPut, mockHistoryWhere, mockHourlyStatsBulkPut, mockHourlyStatsWhere, mockHistoryDelete, mockHistoryOrderBy } = vi.hoisted(() => ({
  mockMetaGet: vi.fn(),
  mockMetaPut: vi.fn(),
  mockHistoryWhere: vi.fn(),
  mockHourlyStatsBulkPut: vi.fn(),
  mockHourlyStatsWhere: vi.fn(),
  mockHistoryDelete: vi.fn(),
  mockHistoryOrderBy: vi.fn(),
}));

const mockHourlyStatsDelete = vi.fn();

vi.mock('../../src/db/index', () => ({
  db: {
    transaction: vi.fn((_mode: string, ..._args: unknown[]) => {
      const callback = _args[_args.length - 1] as () => Promise<void>;
      return callback();
    }),
    meta: { get: mockMetaGet, put: mockMetaPut },
    history: {
      where: mockHistoryWhere,
      orderBy: mockHistoryOrderBy,
    },
    hourlyStats: {
      bulkPut: mockHourlyStatsBulkPut,
      where: mockHourlyStatsWhere,
    },
  },
}));

vi.mock('../../src/db/utils', () => ({
  getTodayStr: () => '2025-06-15',
}));

describe('retention', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHourlyStatsWhere.mockReturnValue({
      equals: vi.fn().mockReturnValue({
        delete: mockHourlyStatsDelete,
      }),
    });
  });

  describe('getRawRetentionDays', () => {
    it('returns default 7 when meta has no record', async () => {
      mockMetaGet.mockResolvedValue(undefined);

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
      expect(mockMetaGet).toHaveBeenCalledWith('retention.rawDays');
    });

    it('returns stored value when meta has record', async () => {
      mockMetaGet.mockResolvedValue({ key: 'retention.rawDays', value: 14 });

      const result = await getRawRetentionDays();

      expect(result).toBe(14);
    });

    it('returns default when stored value is below minimum', async () => {
      mockMetaGet.mockResolvedValue({ key: 'retention.rawDays', value: 0 });

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
    });

    it('returns default when stored value is negative', async () => {
      mockMetaGet.mockResolvedValue({ key: 'retention.rawDays', value: -5 });

      const result = await getRawRetentionDays();

      expect(result).toBe(7);
    });
  });

  describe('setRawRetentionDays', () => {
    it('calls meta.put with correct key/value', async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(30);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: 'retention.rawDays', value: 30 });
    });

    it('clamps value to minimum of 1', async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(0);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: 'retention.rawDays', value: 1 });
    });

    it('clamps negative value to minimum of 1', async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(-10);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: 'retention.rawDays', value: 1 });
    });

    it('rounds fractional days', async () => {
      mockMetaPut.mockResolvedValue(undefined);

      await setRawRetentionDays(7.6);

      expect(mockMetaPut).toHaveBeenCalledWith({ key: 'retention.rawDays', value: 8 });
    });
  });

  describe('aggregateOneDay', () => {
    it('aggregates history records into hourly buckets and deletes history', async () => {
      const records = [
        { startTime: new Date(2025, 0, 10, 9, 30).getTime(), duration: 60000 },
        { startTime: new Date(2025, 0, 10, 9, 45).getTime(), duration: 30000 },
        { startTime: new Date(2025, 0, 10, 14, 0).getTime(), duration: 120000 },
      ];

      mockHistoryWhere.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          each: vi.fn(async (cb: (r: any) => void) => {
            for (const r of records) cb(r);
          }),
          delete: mockHistoryDelete,
        }),
      });

      await aggregateOneDay('2025-01-10');

      expect(mockHourlyStatsDelete).toHaveBeenCalled();
      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([
        { date: '2025-01-10', hour: 9, duration: 90000 },
        { date: '2025-01-10', hour: 14, duration: 120000 },
      ]);
      expect(mockHistoryDelete).toHaveBeenCalled();
    });

    it('only writes non-zero hours', async () => {
      const records = [
        { startTime: new Date(2025, 0, 10, 5, 0).getTime(), duration: 10000 },
      ];

      mockHistoryWhere.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          each: vi.fn(async (cb: (r: any) => void) => {
            for (const r of records) cb(r);
          }),
          delete: mockHistoryDelete,
        }),
      });

      await aggregateOneDay('2025-01-10');

      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([
        { date: '2025-01-10', hour: 5, duration: 10000 },
      ]);
    });

    it('clears existing hourly stats before writing (idempotency)', async () => {
      mockHistoryWhere.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          each: vi.fn(async () => {}),
          delete: mockHistoryDelete,
        }),
      });

      await aggregateOneDay('2025-01-10');

      expect(mockHourlyStatsDelete).toHaveBeenCalled();
      expect(mockHourlyStatsBulkPut).toHaveBeenCalledWith([]);
    });
  });

  describe('runRetentionJob', () => {
    it('processes eligible days and stops at cutoff', async () => {
      // today=2025-06-15, retention=7, cutoff=2025-06-09 (keep 09..15 inclusive)
      mockMetaGet.mockResolvedValue({ key: 'retention.rawDays', value: 7 });

      const mockFirst = vi.fn()
        .mockResolvedValueOnce({ date: '2025-06-05' })
        .mockResolvedValueOnce({ date: '2025-06-07' })
        .mockResolvedValueOnce({ date: '2025-06-09' });

      mockHistoryOrderBy.mockReturnValue({ first: mockFirst });

      mockHistoryWhere.mockReturnValue({
        equals: vi.fn().mockReturnValue({
          each: vi.fn(async () => {}),
          delete: mockHistoryDelete,
        }),
      });

      await runRetentionJob();

      // Should process 2025-06-05 and 2025-06-07, then stop at 2025-06-09 (>= cutoff)
      expect(mockFirst).toHaveBeenCalledTimes(3);
    });

    it('does nothing when no old history exists', async () => {
      mockMetaGet.mockResolvedValue({ key: 'retention.rawDays', value: 7 });

      mockHistoryOrderBy.mockReturnValue({
        first: vi.fn().mockResolvedValue(undefined),
      });

      await runRetentionJob();

      expect(mockHistoryWhere).not.toHaveBeenCalled();
    });
  });
});
