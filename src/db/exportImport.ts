import { db } from "./index";
import type { IHistoryLog, ISiteStat, IPageStat } from "./types";

export interface IExportData {
  version: number;
  exportedAt: string;
  history: IHistoryLog[];
  sites: ISiteStat[];
  pages: IPageStat[];
}

/**
 * Exports all data from the database.
 */
export async function exportAllData(): Promise<IExportData> {
  return await db.transaction("r", [db.history, db.sites, db.pages], async () => {
    const history = await db.history.toArray();
    const sites = await db.sites.toArray();
    const pages = await db.pages.toArray();

    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      history,
      sites,
      pages,
    };
  });
}

/**
 * Imports data into the database.
 * Uses bulkPut to overwrite existing records and add new ones.
 */
export async function importData(data: IExportData): Promise<void> {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid data format");
  }

  // Basic validation
  if (!Array.isArray(data.history) || !Array.isArray(data.sites) || !Array.isArray(data.pages)) {
    throw new Error("Invalid data structure: missing required arrays");
  }

  await db.transaction("rw", [db.history, db.sites, db.pages], async () => {
    if (data.history.length > 0) {
      await db.history.bulkPut(data.history);
    }
    if (data.sites.length > 0) {
      await db.sites.bulkPut(data.sites);
    }
    if (data.pages.length > 0) {
      await db.pages.bulkPut(data.pages);
    }
  });
}
