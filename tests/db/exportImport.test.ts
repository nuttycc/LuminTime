import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAllData, importData } from '../../src/db/exportImport';
import { db } from '../../src/db/index';

// Mock functions using vi.hoisted to avoid ReferenceError
const { mockHistoryBulkPut, mockSitesBulkPut, mockPagesBulkPut } = vi.hoisted(() => ({
  mockHistoryBulkPut: vi.fn(),
  mockSitesBulkPut: vi.fn(),
  mockPagesBulkPut: vi.fn(),
}));

// Mock Dexie
vi.mock('../../src/db/index', () => ({
  db: {
    transaction: vi.fn((_mode: string, _tables: unknown, callback: () => void) => callback()),
    history: { toArray: vi.fn(), bulkPut: mockHistoryBulkPut },
    sites: { toArray: vi.fn(), bulkPut: mockSitesBulkPut },
    pages: { toArray: vi.fn(), bulkPut: mockPagesBulkPut },
  }
}));

describe('exportImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('exportAllData', () => {
    it('should export data from all tables', async () => {
      // Setup mock data
      const mockHistoryData = [{ id: 1, date: '2023-01-01' }];
      const mockSitesData = [{ hostname: 'example.com' }];
      const mockPagesData = [{ path: '/test' }];

      (db.history.toArray as any).mockResolvedValue(mockHistoryData);
      (db.sites.toArray as any).mockResolvedValue(mockSitesData);
      (db.pages.toArray as any).mockResolvedValue(mockPagesData);

      const result = await exportAllData();

      expect(result.history).toEqual(mockHistoryData);
      expect(result.sites).toEqual(mockSitesData);
      expect(result.pages).toEqual(mockPagesData);
      expect(result.version).toBe(1);
      expect(result.exportedAt).toBeDefined();
    });
  });

  describe('importData', () => {
    it('should import data into all tables', async () => {
      const importPayload = {
        version: 1,
        exportedAt: '2023-01-01T00:00:00.000Z',
        history: [{ id: 1, date: '2023-01-01' }] as any,
        sites: [{ hostname: 'example.com' }] as any,
        pages: [{ path: '/test' }] as any,
      };

      await importData(importPayload);

      expect(mockHistoryBulkPut).toHaveBeenCalledWith(importPayload.history);
      expect(mockSitesBulkPut).toHaveBeenCalledWith(importPayload.sites);
      expect(mockPagesBulkPut).toHaveBeenCalledWith(importPayload.pages);
    });

    it('should throw error for invalid data structure', async () => {
      const invalidPayload = {
        version: 1,
        // Missing arrays
      } as any;

      await expect(importData(invalidPayload)).rejects.toThrow('Invalid data structure');
    });
  });
});
