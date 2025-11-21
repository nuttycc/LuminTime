// oxlint-disable no-magic-numbers
// oxlint-disable max-lines-per-function
export default defineBackground(() => {
  console.log('Hello background!', { id: browser.runtime.id });

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

  const endTracking = () => {
    // Validate activeSession before processing
    if (!activeSession.url || activeSession.startTime <= 0 || activeSession.lastUpdateTime <= 0) {
      return;
    }

    const now = Date.now()
    activeSession.duration += now - activeSession.lastUpdateTime;
    activeSession.lastUpdateTime = now;

    //write to db...

    console.log('write to db:', activeSession)


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
    console.log('Tab activated, activeInfo:', activeInfo)

    endTracking()

    browser.tabs.get(activeInfo.tabId)
      .then((tab) => {
        console.log('Tab activated, get tab:', tab);
        if (tab.url === undefined) {
          throw new Error('Tab url is undefined.');
        }
        startTracking(tab.url);
      })
      .catch((error) => {
        console.error('Error getting tab:', error);
      });
  });

  // url changes
  browser.webNavigation.onCompleted.addListener((details) => {
    browser.tabs.get(details.tabId)
      .then(async (tab) => {
        const window = await browser.windows.get(tab.windowId);

        if (tab.active && window.focused) {
          endTracking();
          if (tab.url === undefined) {
            throw new Error('Tab url is undefined.');
          }
          startTracking(tab.url);
        }
      })
      .catch((error) => {
        console.error('Error getting tab:', error);
      });
  });


  // no url changes
  browser.windows.onFocusChanged.addListener((windowId) => {
    console.log('Window focus changed, windowId:', windowId);
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      endTracking()
    } else {
      endTracking()
      browser.tabs.query({ active: true, currentWindow: true })
        .then((tabs) => {
          console.log('Window focus changed, get tab:', tabs);
          if (tabs[0].url === undefined) {
            throw new Error('Tab url is undefined.');
          }
          startTracking(tabs[0].url);
        })
        .catch((error) => {
          console.error('Error getting tab:', error);
        });
    }
  });

  browser.idle.onStateChanged.addListener((state) => {
    console.log('Idle state changed, state:', state);
    if (state === 'active') {
      // Fetch the current active tab instead of using stale activeSession.url
      browser.tabs.query({ active: true, currentWindow: true })
        .then((tabs) => {
          const [tab] = tabs;
          if (tab.url === undefined) {
            console.warn('No active tab or tab URL available on idle resume');
            return;
          }
          // Update activeSession with fresh URL and start tracking
          activeSession.url = tab.url;
          startTracking(tab.url);
        })
        .catch((error) => {
          console.error('Error getting active tab on idle resume:', error);
        });
    } else {
      endTracking()
    }
  });
});
