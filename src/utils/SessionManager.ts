import { AsyncQueuer } from "@tanstack/pacer";
import type { EventSource } from "@/db/types";

export interface ActiveSessionData {
  url: string;
  title: string;
  startTime: number;
  lastUpdateTime: number;
  duration: number;
  eventSource?: EventSource;
}

export interface SessionDependencies {
  storage: {
    getValue: () => Promise<ActiveSessionData>;
    setValue: (val: ActiveSessionData) => Promise<void>;
    removeValue: () => Promise<void>;
  };
  recordActivity: (
    url: string,
    duration: number,
    title?: string,
    startTime?: number,
    eventSource?: EventSource,
  ) => Promise<void>;
  alarmName: string;
  alarmPeriodInMinutes: number;
  /** Optional callback to check if a URL should be blocked from tracking. */
  isUrlBlocked?: (url: string) => boolean;
}

export class SessionManager {
  private queue: AsyncQueuer<() => Promise<void>>;
  private deps: SessionDependencies;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 500;
  private _hasActiveSession = false;

  constructor(deps: SessionDependencies) {
    this.deps = deps;
    // Concurrency 1 guarantees that _processTransition runs serially
    // AsyncQueuer expects a processor function as the first argument
    this.queue = new AsyncQueuer(
      async (task: () => Promise<void>) => {
        await task();
      },
      {
        concurrency: 1,
      },
    );
  }

  /**
   * Initialize session manager: restore alarm if there's a persisted active session.
   * Must be called once after construction.
   */
  async init() {
    const session = await this.deps.storage.getValue();
    if (session.url) {
      this._hasActiveSession = true;
      await this._ensureAlarm();
    }
  }

  /**
   * Main entry point for events.
   * @param type - 'switch': Debounced tab switch/nav. 'alarm': Periodic save. 'idle': State change(windows/system).
   * @param data - Snapshot of the target state (e.g. the new URL to track).
   *               For 'alarm', this can be omitted to imply "keep tracking current".
   */
  handleEvent(
    type: "switch" | "alarm" | "idle",
    data?: { url: string | null; title?: string; eventSource?: EventSource },
  ) {
    if (type === "switch") {
      // Debounce logic for rapid tab switching
      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        this.queue.addItem(() => this._executeTransition(data, data?.eventSource));
      }, this.DEBOUNCE_MS);
    } else {
      // Clear any pending debounce timer to prevent ghost sessions
      if (this.debounceTimer) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = null;
      }

      if (type === "alarm") {
        // Alarm needs to resolve the *current* session inside the lock to decide what to do
        this.queue.addItem(() => this._executeAlarmTick());
      } else {
        // Idle events (immediate)
        this.queue.addItem(() => this._executeTransition(data, data?.eventSource));
      }
    }
  }

  /**
   * Standard transition: End current session -> Start new session (if data.url exists)
   */
  private async _executeTransition(
    data?: { url: string | null; title?: string },
    eventSource?: EventSource,
  ) {
    try {
      // 1. End current session
      const session = await this.deps.storage.getValue();
      await this._endSession(session);

      // 2. Start new session if a valid URL is provided (and not blocked)
      const hasNewTarget = typeof data?.url === "string" && data.url.length > 0;
      const isBlocked = hasNewTarget && this.deps.isUrlBlocked?.(data.url as string);
      if (hasNewTarget && !isBlocked) {
        await this._startSession(data.url as string, data.title, eventSource);
      } else if (this._hasActiveSession) {
        // Transition to idle: clear alarm
        this._hasActiveSession = false;
        await this._clearAlarm();
      }
    } catch (error) {
      console.error("Session: Error in transition", error);
    }
  }

  /**
   * Alarm Tick: End current session -> Restart same session
   */
  private async _executeAlarmTick() {
    try {
      const session = await this.deps.storage.getValue();

      console.log("Session: Alarm tick", session);

      // Only tick if we have a valid active session
      if (session.url) {
        await this._endSession(session);
        await this._startSession(session.url, session.title, "alarm");
      } else if (this._hasActiveSession) {
        // Stale alarm: no active session but alarm still running
        this._hasActiveSession = false;
        await this._clearAlarm();
      }
    } catch (error) {
      console.error("Session: Error in alarm tick", error);
    }
  }

  private async _endSession(session: ActiveSessionData) {
    if (!session.url || session.startTime <= 0) return;

    const now = Date.now();
    // Calculate duration
    const elapsed = now - session.lastUpdateTime;
    const finalDuration = (session.duration || 0) + elapsed;

    // Persist to DB
    // Only record if duration is positive (or whatever threshold, currently strict > 0)
    if (finalDuration > 0) {
      await this.deps.recordActivity(
        session.url,
        finalDuration,
        session.title,
        session.startTime,
        session.eventSource,
      );
    }

    // Clear from storage
    await this.deps.storage.removeValue();
    console.log("Session: Tracking ended:", session.url, {
      elapsedMs: elapsed,
      finalDurationMs: finalDuration,
    });
  }

  private async _startSession(url: string, title?: string, eventSource?: EventSource) {
    const newSession: ActiveSessionData = {
      url,
      title: title ?? "",
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      duration: 0,
      eventSource,
    };
    await this.deps.storage.setValue(newSession);

    if (!this._hasActiveSession) {
      this._hasActiveSession = true;
      await this._ensureAlarm();
    }
    console.log("Session: Tracking started:", url);
  }

  private async _ensureAlarm() {
    const existing = await browser.alarms.get(this.deps.alarmName);
    if (!existing) {
      await browser.alarms.create(this.deps.alarmName, {
        periodInMinutes: this.deps.alarmPeriodInMinutes,
      });
      console.log("Session: Alarm created");
    }
  }

  private async _clearAlarm() {
    await browser.alarms.clear(this.deps.alarmName);
    console.log("Session: Alarm cleared");
  }
}
