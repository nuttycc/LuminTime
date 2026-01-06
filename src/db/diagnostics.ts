import { db } from './index';

export interface IDbStats {
  historyCount: number;
  sitesCount: number;
  pagesCount: number;
  storageUsage?: number;
  storageQuota?: number;
}

export async function getDatabaseStats(): Promise<IDbStats> {
  const [historyCount, sitesCount, pagesCount] = await Promise.all([
    db.history.count(),
    db.sites.count(),
    db.pages.count(),
  ]);

  let storageUsage: number | undefined;
  let storageQuota: number | undefined;

  if (navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      storageUsage = estimate.usage;
      storageQuota = estimate.quota;
    } catch (e) {
      console.error('Failed to get storage estimate', e);
    }
  }

  return {
    historyCount,
    sitesCount,
    pagesCount,
    storageUsage,
    storageQuota
  };
}
