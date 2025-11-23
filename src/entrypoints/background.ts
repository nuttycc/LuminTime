// oxlint-disable no-magic-numbers
// oxlint-disable no-unsafe-member-access, no-explicit-any

import { recordActivity, getTodayTopSites, getSitePagesDetail } from "@/db/service";
import { db } from "@/db";
import { getTodayStr } from "@/db/utils";

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
      visits: s.visitCount
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


// oxlint-disable-next-line max-lines-per-function
export default defineBackground(() => {

  // oxlint-disable-next-line no-unsafe-type-assertion
  (globalThis as any).lumintime = debugTools;

  console.log('Hello background!', { id: browser.runtime.id });

  console.log('💡 调试工具已加载.');

  interface ActiveSession {
    url: string;
    startTime: number;
    lastUpdateTime: number;
    duration: number;
  }

  const activeSession: ActiveSession = {
    url: "",
    startTime: 0,
    lastUpdateTime: 0,
    duration: 0
  };


  const SESSION_TICK_ALARM = "session-update";
  const checkAlarmState = async () => {
    const alarm = await browser.alarms.get(SESSION_TICK_ALARM);

    if (alarm) {
      console.log('Alarm already exists, skip creating:', alarm)
      return
    }

    await browser.alarms.create(SESSION_TICK_ALARM, { periodInMinutes: 1 });

    browser.alarms.onAlarm.addListener((alarm) => {
      console.log('Alarm created:', alarm);
      const now = Date.now()
      activeSession.lastUpdateTime = now;

      const duration = now - activeSession.lastUpdateTime;

      // ignore long duration
      if (duration - 60 * 1000 > 30 * 1000) {
        activeSession.duration += 0
      } else {
        activeSession.duration += duration
      }

    });
  }

  const startTracking = (url: string) => {
    activeSession.startTime = Date.now();
    activeSession.lastUpdateTime = Date.now();
    activeSession.duration = 0;
    activeSession.url = url
    console.log('start tracking:', activeSession)
  }

  const endTracking = async () => {
    // Validate activeSession before processing
    if (!activeSession.url || activeSession.startTime <= 0 || activeSession.lastUpdateTime <= 0) {
      return;
    }


    const now = Date.now()
    activeSession.duration += now - activeSession.lastUpdateTime;
    activeSession.lastUpdateTime = now;

    // Get the latest title from current active tab
    const tabs = await browser.tabs.query({ active: true, currentWindow: true })
    const title = tabs[0]?.title

    //write to db...
    await recordActivity(activeSession.url, activeSession.duration, title)

    console.log('end tracking, write to db:', activeSession)

    // reset
    activeSession.duration = 0;
    activeSession.startTime = 0;
    activeSession.lastUpdateTime = 0;
    activeSession.url = "";
  }

  checkAlarmState().then(() => {
    console.log('Alarm checked');
  }).catch((error) => {
    console.error('Error checking alarm:', error);
  })

  // focus changes
  browser.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      try {
        console.log('Tab activated, activeInfo:', activeInfo)
        await endTracking()

        const tab = await browser.tabs.get(activeInfo.tabId)
        console.log('Tab activated, get tab:', tab)

        if (tab.url === undefined) {
          throw new Error('Tab url is undefined.')
        }

        startTracking(tab.url)
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
          startTracking(tab.url)
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
        console.log('Window focus changed, windowId:', windowId)
        if (windowId === browser.windows.WINDOW_ID_NONE) {
          await endTracking()
        } else {
          await endTracking()
          const tabs = await browser.tabs.query({ active: true, currentWindow: true })
          console.log('Window focus changed, get tab:', tabs)
          if (tabs[0].url === undefined) {
            throw new Error('Tab url is undefined.')
          }
          startTracking(tabs[0].url)
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
          const tabs = await browser.tabs.query({ active: true, currentWindow: true })
          const [tab] = tabs
          if (tab.url === undefined) {
            console.warn('No active tab or tab URL available on idle resume')
            return
          }
          // Update activeSession with fresh URL and start tracking
          activeSession.url = tab.url
          startTracking(tab.url)
        } else {
          await endTracking()
        }
      } catch (error) {
        console.error('Error getting active tab on idle resume:', error)
      }
    })()
  });
});
