// oxlint-disable max-lines
// oxlint-disable no-magic-numbers
// oxlint-disable no-unsafe-member-access, no-explicit-any

import { recordActivity, getTodayTopSites } from "@/db/service";
import { db } from "@/db";
import { getTodayStr } from "@/db/utils";
import { SessionManager, type ActiveSessionData } from "@/utils/SessionManager";

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

  // Initialize SessionManager with dependencies
  const sessionManager = new SessionManager({
    storage: sessionStorage,
    recordActivity
  });

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

  // Session tick handler: periodically settle and restart tracking for data reliability
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_TICK_ALARM) {
       // Use special 'alarm' type which internally handles the "Restart Current" logic
       sessionManager.handleEvent('alarm');
    }
  });

  // focus changes
  browser.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        console.log('Tab activated:', tab.url);

        // Pass the explicit URL/Title (Snapshot) to the manager
        sessionManager.handleEvent('switch', { url: tab.url ?? null, title: tab.title });
      } catch (error) {
        console.error('Error in tab activation:', error)
      }
    })()
  });

  // url changes
  browser.webNavigation.onCompleted.addListener((details) => {
    // Step 4: Fix Iframe Bug - Ignore non-top-level navigation
    if (details.frameId !== 0) return;

    void (async () => {
      try {
        const tab = await browser.tabs.get(details.tabId)
        const window = await browser.windows.get(tab.windowId)

        if (tab.active && window.focused) {
          sessionManager.handleEvent('switch', { url: tab.url ?? null, title: tab.title });
        }
      } catch (error) {
        console.error('Error getting tab:', error)
      }
    })()
  });


  // Window focus changes
  browser.windows.onFocusChanged.addListener((windowId) => {
    void (async () => {
      try {
        console.log('Window focus changed, current:', windowId)

        if (windowId === browser.windows.WINDOW_ID_NONE) {
          // Stop tracking immediately
          sessionManager.handleEvent('idle', { url: null });
        } else {
          // Switch to the new window's active tab
          const result = await getActiveTabUrl()
          sessionManager.handleEvent('switch', { url: result?.url ?? null, title: result?.title });
        }
      } catch (error) {
        console.error('Error getting tab:', error)
      }
    })()
  });

  // Idle state changes
  browser.idle.onStateChanged.addListener((state) => {
    void (async () => {
      try {
        console.log('Idle state changed, state:', state)
        if (state === 'active') {
          // Fetch the current active tab
          const result = await getActiveTabUrl()
          if (!result) {
            console.warn('No active tab or tab URL available on idle resume')
            return
          }
          sessionManager.handleEvent('idle', { url: result.url, title: result.title });
        } else {
          // Stop tracking
          sessionManager.handleEvent('idle', { url: null });
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
