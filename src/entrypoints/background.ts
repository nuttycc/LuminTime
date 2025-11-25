// oxlint-disable max-lines
// oxlint-disable no-magic-numbers
import { recordActivity } from "@/db/service";
import { SessionManager, type ActiveSessionData } from "@/utils/SessionManager";
import { debugTools } from "@/utils/debugTools";


const IDLE_DETECTION_INTERVAL = 30
const SESSION_TICK_ALARM_NAME = "session-update";
const SESSION_PER_MINUTE = 1;

const sessionStorage = storage.defineItem<ActiveSessionData>("session:activeSession", {
  fallback: {
    url: "",
    title: "",
    startTime: 0,
    lastUpdateTime: 0,
    duration: 0,
  }
});

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

  // oxlint-disable-next-line no-unsafe-type-assertion oxlint-disable-next-line no-unsafe-member-access
  (globalThis as any).lumintime = debugTools;

  console.log('Hello background!', { id: browser.runtime.id });
  console.log('💡 调试工具已加载.');

  // Initialize SessionManager with dependencies
  const sessionManager = new SessionManager({
    storage: sessionStorage,
    recordActivity,
  });

  const checkAlarmState = async () => {
    // create alarm if not exists
    const alarm = await browser.alarms.get(SESSION_TICK_ALARM_NAME);
    if (alarm) {
      console.log('Alarm already exists:', alarm);
    } else {
      await browser.alarms.create(SESSION_TICK_ALARM_NAME, { periodInMinutes: SESSION_PER_MINUTE });
      console.log(`Alarm created: ${SESSION_PER_MINUTE} min intervals`);
    }
  }

  // Session tick handler: periodically settle and restart tracking for data reliability
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === SESSION_TICK_ALARM_NAME) {
      // Use special 'alarm' type which internally handles the "Restart Current" logic
      sessionManager.handleEvent('alarm');
    }
  });

  // tab activates
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

  // navigation
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

  // window focus state changes
  browser.windows.onFocusChanged.addListener((windowId) => {
    void (async () => {
      try {
        console.log('Window focus changed, current:', windowId)
        if (windowId === browser.windows.WINDOW_ID_NONE) {
          sessionManager.handleEvent('idle', { url: null });
        } else {
          const result = await getActiveTabUrl()
          sessionManager.handleEvent('switch', { url: result?.url ?? null, title: result?.title });
        }
      } catch (error) {
        console.error('Window focus change, Error getting tab:', error)
      }
    })()
  });

  // system state changes
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
    console.log('Alarm check completed successfully.');
  }).catch((error) => {
    console.error('Error checking alarm:', error);
  })

  browser.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL)
});
