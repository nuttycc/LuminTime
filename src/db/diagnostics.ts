import { db } from "./index";

export interface IDbStats {
  historyCount: number;
  sitesCount: number;
  pagesCount: number;
  storageUsage?: number;
  storageQuota?: number;
}

async function getStorageEstimate(): Promise<{
  storageUsage?: number;
  storageQuota?: number;
}> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) {
    return {};
  }

  try {
    const estimate = await navigator.storage.estimate();
    return {
      storageUsage: estimate.usage,
      storageQuota: estimate.quota,
    };
  } catch (error) {
    console.error("Failed to get storage estimate", error);
    return {};
  }
}

export async function getDatabaseStats(): Promise<IDbStats> {
  const [historyCount, pagesCount, sitesCount, storageEstimate] = await Promise.all([
    db.history.count(),
    db.pages.count(),
    db.sites.count(),
    getStorageEstimate(),
  ]);

  return {
    historyCount,
    pagesCount,
    sitesCount,
    ...storageEstimate,
  };
}
