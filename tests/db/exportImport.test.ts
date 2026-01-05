import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportAllData, importData } from '../../src/db/exportImport';
import { db } from '../../src/db/index';

// Mock Dexie
vi.mock('../../src/db/index', () => {
  const mockHistory = {
    toArray: vi.fn(),
    bulkPut: vi.fn(),
  };
  const mockSites = {
    toArray: vi.fn(),
    bulkPut: vi.fn(),
  };
  const mockPages = {
    toArray: vi.fn(),
    bulkPut: vi.fn(),
  };

  return {
    db: {
      transaction: vi.fn((mode, tables, callback) => callback()),
      history: mockHistory,
      sites: mockSites,
      pages: mockPages,
    }
  };
});

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

      expect(db.history.bulkPut).toHaveBeenCalledWith(importPayload.history);
      expect(db.sites.bulkPut).toHaveBeenCalledWith(importPayload.sites);
      expect(db.pages.bulkPut).toHaveBeenCalledWith(importPayload.pages);
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
