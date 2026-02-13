// oxlint-disable max-lines
// oxlint-disable no-magic-numbers
import { recordActivity } from "@/db/service";
import { runRetentionJob } from "@/db/retention";
import { getBlocklist, isHostnameBlocked } from "@/db/blocklist";
import { SessionManager, type ActiveSessionData } from "@/utils/SessionManager";

const IDLE_DETECTION_INTERVAL = 30;

const SESSION_TICK_ALARM_NAME = "session-update";
const SESSION_PER_MINUTE = 1;

const RETENTION_ALARM_NAME = "retention-cleanup";
const RETENTION_ALARM_PERIOD = 60;

let retentionRunning = false;
let lastKnownBrowserFocused: boolean | null = null;

async function safeRunRetention(maxDays?: number) {
  if (retentionRunning) return;
  retentionRunning = true;
  try {
    await runRetentionJob(maxDays);
  } finally {
    retentionRunning = false;
  }
}

const sessionStorage = storage.defineItem<ActiveSessionData>("session:activeSession", {
  fallback: {
    url: "",
    title: "",
    startTime: 0,
    lastUpdateTime: 0,
    duration: 0,
  },
});

const isExpectedBrowserError = (error: unknown): boolean => {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    msg.includes("No tab with id") ||
    msg.includes("No window with id") ||
    msg.includes("No last-focused window") ||
    msg.includes("Tabs cannot be edited")
  );
};

const getActiveTabUrl = async () => {
  const tabs = await browser.tabs.query({ active: true, currentWindow: true });
  if (tabs.length === 0) {
    return null;
  }
  const tab = tabs[0];
  if (tab.url === undefined || tab.url === "") {
    return null;
  }

  console.log("Got active tab:", tab);
  return { url: tab.url, title: tab.title };
};

// oxlint-disable-next-line max-lines-per-function
export default defineBackground(() => {
  console.log("Hello background!", { id: browser.runtime.id });

  // --- Blocklist cache ---
  let cachedBlocklist: string[] = [];

  const refreshBlocklist = () => {
    getBlocklist()
      .then((list) => {
        cachedBlocklist = list;
        console.log("Blocklist refreshed:", list.length, "entries");
      })
      .catch((error) => {
        console.error("Failed to load blocklist:", error);
      });
  };

  const isUrlBlocked = (url: string): boolean => {
    try {
      const { hostname } = new URL(url);
      return isHostnameBlocked(hostname.toLowerCase().replace(/^www\./, ""), cachedBlocklist);
    } catch {
      return false;
    }
  };

  // Initialize SessionManager with dependencies
  const sessionManager = new SessionManager({
    storage: sessionStorage,
    recordActivity,
    alarmName: SESSION_TICK_ALARM_NAME,
    alarmPeriodInMinutes: SESSION_PER_MINUTE,
    isUrlBlocked,
  });

  const startTrackingFromFocusedWindow = async () => {
    const result = await getActiveTabUrl();
    sessionManager.handleEvent("switch", {
      url: result?.url ?? null,
      title: result?.title,
      eventSource: "window_focus",
    });
  };

  const applyBrowserFocusState = async (isFocused: boolean) => {
    if (!isFocused) {
      if (lastKnownBrowserFocused !== false) {
        lastKnownBrowserFocused = false;
        sessionManager.handleEvent("idle", { url: null });
      }
      return false;
    }

    if (lastKnownBrowserFocused === false) {
      lastKnownBrowserFocused = true;
      await startTrackingFromFocusedWindow();
      return true;
    }

    if (lastKnownBrowserFocused === null) {
      lastKnownBrowserFocused = true;
    }

    return true;
  };

  const reconcileBrowserFocusState = async () => {
    try {
      const focusedWindow = await browser.windows.getLastFocused();
      return await applyBrowserFocusState(focusedWindow.focused);
    } catch (error) {
      if (isExpectedBrowserError(error)) {
        console.debug("Unable to reconcile browser focus state:", error);
        return null;
      }
      console.error("Failed to reconcile browser focus state:", error);
      return null;
    }
  };

  // Session tick handler: periodically settle and restart tracking for data reliability
  browser.alarms.onAlarm.addListener((alarm) => {
    void (async () => {
      if (alarm.name === SESSION_TICK_ALARM_NAME) {
        const isFocused = await reconcileBrowserFocusState();
        if (isFocused) {
          sessionManager.handleEvent("alarm");
        }
      } else if (alarm.name === RETENTION_ALARM_NAME) {
        safeRunRetention().catch((error) => {
          console.error("Retention job failed:", error);
        });
      }
    })();
  });

  // tab activates
  browser.tabs.onActivated.addListener((activeInfo) => {
    void (async () => {
      try {
        const tab = await browser.tabs.get(activeInfo.tabId);
        console.log("Tab activated:", tab.url);

        // Pass the explicit URL/Title (Snapshot) to the manager
        sessionManager.handleEvent("switch", {
          url: tab.url ?? null,
          title: tab.title,
          eventSource: "tab_activated",
        });
      } catch (error) {
        if (isExpectedBrowserError(error)) {
          console.debug("Tab unavailable:", error);
          return;
        }
        console.error("Failed to handle tab activation:", error);
      }
    })();
  });

  // navigation
  browser.webNavigation.onCompleted.addListener((details) => {
    // Ignore non-top-level navigation
    if (details.frameId !== 0) return;

    void (async () => {
      try {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        if (tabs.length === 0) return;

        const [activeTab] = tabs;
        const window = await browser.windows.get(activeTab.windowId);
        if (!window.focused || activeTab.id !== details.tabId) return;

        sessionManager.handleEvent("switch", {
          url: activeTab.url ?? null,
          title: activeTab.title,
          eventSource: "navigation",
        });
      } catch (error) {
        if (isExpectedBrowserError(error)) {
          console.debug("Navigation: Tab/window unavailable:", error);
          return;
        }
        console.error(`Failed to process navigation to ${details.url}:`, error);
      }
    })();
  });

  // window focus state changes
  browser.windows.onFocusChanged.addListener((windowId) => {
    void (async () => {
      try {
        console.log("Window focus changed, current:", windowId);
        if (windowId === browser.windows.WINDOW_ID_NONE) {
          await applyBrowserFocusState(false);
        } else {
          await applyBrowserFocusState(true);
        }
      } catch (error) {
        if (isExpectedBrowserError(error)) {
          console.debug("Focused window unavailable:", error);
          return;
        }
        console.error("Failed to process window focus change:", error);
      }
    })();
  });

  // system state changes
  browser.idle.onStateChanged.addListener((state) => {
    void (async () => {
      try {
        console.log("Idle state changed, state:", state);
        if (state === "active") {
          // Check if browser window is focused first
          const focusedWindow = await browser.windows.getLastFocused();
          if (!focusedWindow.focused) {
            return; // Browser not focused, don't start tracking
          }

          const result = await getActiveTabUrl();
          if (!result) {
            console.warn("No active tab or tab URL available on idle resume");
            return;
          }
          sessionManager.handleEvent("idle", {
            url: result.url,
            title: result.title,
            eventSource: "idle_resume",
          });
        } else {
          // Stop tracking
          sessionManager.handleEvent("idle", { url: null });
        }
      } catch (error) {
        if (isExpectedBrowserError(error)) {
          console.debug("Browser state unavailable:", error);
          return;
        }
        console.error("Failed to handle idle state change:", error);
      }
    })();
  });

  // Load blocklist on startup
  refreshBlocklist();

  // Listen for messages from popup to refresh blocklist
  browser.runtime.onMessage.addListener((message) => {
    if (message === "blocklist-updated") {
      refreshBlocklist();
    }
  });

  void (async () => {
    try {
      await sessionManager.init();
      await reconcileBrowserFocusState();
    } catch (error) {
      console.error("Failed to initialize session manager:", error);
    }
  })();

  browser.idle.setDetectionInterval(IDLE_DETECTION_INTERVAL);

  void browser.alarms.create(RETENTION_ALARM_NAME, {
    delayInMinutes: 2,
    periodInMinutes: RETENTION_ALARM_PERIOD,
  });

  safeRunRetention(1).catch((error) => {
    console.error("Initial retention job failed:", error);
  });
});
