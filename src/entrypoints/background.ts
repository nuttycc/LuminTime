// oxlint-disable max-lines
// oxlint-disable no-magic-numbers
// oxlint-disable no-unsafe-member-access, no-explicit-any

import { recordActivity, getTodayTopSites, getSitePagesDetail } from "@/db/service";
import { db } from "@/db";
import { getTodayStr } from "@/db/utils";

// Define persistent session storage for SW crash recovery
interface ActiveSessionData {
  url: string;
  title: string;
  startTime: number;
  lastUpdateTime: number;
  duration: number;
  isStopped: boolean;
}

const sessionStorage = storage.defineItem<ActiveSessionData>("session:activeSession", {
  fallback: {
    url: "",
    title: "",
    startTime: 0,
    lastUpdateTime: 0,
    duration: 0,
    isStopped: false
  }
});

const IDLE_DETECTION_INTERVAL = 30

// 挂载调试工具到全局
const debugTools = {
  async stats() {
    const today = getTodayStr();
    const historyCount = await db.history.where('date').equals(today).count();
    const sitesCount = await db.sites.where('date').equals(today).count();
    const pagesCount = await db.pages.where('date').equals(today).count();
    console.log(`📊 今日统计: 历史${historyCount}条, 站点${sitesCount}个, 页面${pagesCount}个`);
    return { historyCount, sitesCount, pagesCount };
  },
  async topSites(limit = 10) {
    const sites = await getTodayTopSites(limit);
    console.table(sites.map(s => ({
      domain: s.domain,
      duration: `${(s.duration / 1000 / 60).toFixed(2)}分`,
      lastVisit: new Date(s.lastVisit).toLocaleTimeString()
    })));
    return sites;
  },
  async clear() {
    const today = getTodayStr();
    await db.transaction('rw', db.history, db.sites, db.pages, async () => {
      await db.history.where('date').equals(today).delete();
      await db.sites.where('date').equals(today).delete();
      await db.pages.where('date').equals(today).delete();
    });
    console.log('✓ 已清空今日数据');
  },
  raw: {
    async history() {
      const today = getTodayStr();
      const data = await db.history.where('date').equals(today).toArray();
      console.log(`📋 原始历史表 (${data.length}条):`);
      console.table(data);
      return data;
    },
    async sites() {
      const today = getTodayStr();
      const data = await db.sites.where('date').equals(today).toArray();
      console.log(`📋 原始站点表 (${data.length}个):`);
      console.table(data);
      return data;
    },
    async pages() {
      const today = getTodayStr();
      const data = await db.pages.where('date').equals(today).toArray();
      console.log(`📋 原始页面表 (${data.length}个):`);
      console.table(data);
      return data;
    }
  }
};

const getActiveTabUrl = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true })
  if (tabs.length === 0) {
    return null
  }
  const tab = tabs[0]
  if (tab.url === undefined || tab.url === '') {
    return null
  }
  return { url: tab.url, title: tab.title }
}

// oxlint-disable-next-line max-lines-per-function
export default defineBackground(() => {

  // oxlint-disable-next-line no-unsafe-type-assertion
  (globalThis as any).lumintime = debugTools;

  console.log('Hello background!', { id: browser.runtime.id });

  console.log('💡 调试工具已加载.');

  const SESSION_TICK_ALARM = "session-update";
  const SESSION_PER_MINUTE = 1;
  const checkAlarmState = async () => {
    // Only create alarm if it doesn't exist
    const alarm = await browser.alarms.get(SESSION_TICK_ALARM);
    if (alarm) {
      console.log('Alarm already exists:', alarm);
    } else {
      await browser.alarms.create(SESSION_TICK_ALARM, { periodInMinutes: SESSION_PER_MINUTE });
      console.log(`Alarm created: ${SESSION_PER_MINUTE} min intervals`);
    }
  }

  const startTracking = async (url: string, title?: string) => {
    const newSession: ActiveSessionData = {
      url,
      title: title ?? "",
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      duration: 0,
      isStopped: false
    };
    await sessionStorage.setValue(newSession);
    console.log('start tracking:', newSession);
  }

  const endTracking = async () => {
    const session = await sessionStorage.getValue();

    // Validate session before processing
    if (!session.url || session.startTime <= 0 || session.lastUpdateTime <= 0) {
      console.log('end tracking, skip null data:', session);
      return;
    }

    const now = Date.now();
    const duration = (session.duration ?? 0) + (now - session.lastUpdateTime);

    // Clear from persistent storage
    await sessionStorage.removeValue();

    // Write to db
    await recordActivity(session.url, duration, session.title || undefined);

    console.log('end tracking, write to db:', { ...session, duration });
  }

  // Session tick handler: periodically settle and restart tracking for data reliability
  browser.alarms.onAlarm.addListener((alarm) => {
    void (async () => {
      try {
        if (alarm.name !== SESSION_TICK_ALARM) {
          return;
        }

        const session = await sessionStorage.getValue();

        // Skip if no active session or the session is too short (<1s)
        const elapsed = Date.now() - session.lastUpdateTime;
        if (!session.url || session.startTime <= 0 || elapsed < 1000) {
          return;
        }

        // Save current session context before endTracking() clears
        const sessionUrl = session.url;
        const sessionTitle = session.title;

        // Settle current session and write to db
        await endTracking();

        // Restart tracking the same URL to maintain continuity
        await startTracking(sessionUrl, sessionTitle);

        console.log(`✅ Session ticked.`);
      } catch (error) {
        console.error('Error in session tick:', error);
      }
    })();
  });

  // focus changes
  browser.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId)
        console.log('Tab activated, get tab:', tab)

        await endTracking()

        if (tab.url === undefined) {
          throw new Error('Tab url is undefined.')
        }

        await startTracking(tab.url, tab.title)
      } catch (error) {
        console.error('Error in tab activation:', error)
      }
    })()
  });

  // url changes
  browser.webNavigation.onCompleted.addListener((details) => {
    void (async () => {
      try {
        const tab = await browser.tabs.get(details.tabId)
        const window = await browser.windows.get(tab.windowId)

        if (tab.active && window.focused) {
          await endTracking()
          if (tab.url === undefined) {
            throw new Error('Tab url is undefined.')
          }
          await startTracking(tab.url, tab.title)
        }
      } catch (error) {
        console.error('Error getting tab:', error)
      }
    })()
  });


  // no url changes
  browser.windows.onFocusChanged.addListener((windowId) => {
    void (async () => {
      try {
        console.log('Window focus changed, current:', windowId)

        if (windowId === browser.windows.WINDOW_ID_NONE) {
          await endTracking()
        } else {
          await endTracking()
          const result = await getActiveTabUrl()
          if (!result) {
            throw new Error('Tab url is undefined.')
          }
          await startTracking(result.url, result.title)
        }
      } catch (error) {
        console.error('Error getting tab:', error)
      }
    })()
  });

  browser.idle.onStateChanged.addListener((state) => {
    void (async () => {
      try {
        console.log('Idle state changed, state:', state)
        if (state === 'active') {
          // Fetch the current active tab instead of using stale activeSession.url
          const result = await getActiveTabUrl()
          if (!result) {
            console.warn('No active tab or tab URL available on idle resume')
            return
          }
          await startTracking(result.url, result.title)
        } else {
          await endTracking()
        }
      } catch (error) {
        console.error('Error getting active tab on idle resume:', error)
      }
    })()
  });


  checkAlarmState().then(() => {
    console.log('Alarm checked');
  }).catch((error) => {
    console.error('Error checking alarm:', error);
  })

  browser.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL)
});
