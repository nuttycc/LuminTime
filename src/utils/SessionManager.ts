import { AsyncQueuer } from "@tanstack/pacer";

export interface ActiveSessionData {
  url: string;
  title: string;
  startTime: number;
  lastUpdateTime: number;
  duration: number;
}

export interface SessionDependencies {
  storage: {
    getValue: () => Promise<ActiveSessionData>;
    setValue: (val: ActiveSessionData) => Promise<void>;
    removeValue: () => Promise<void>;
  };
  recordActivity: (url: string, duration: number, title?: string) => Promise<void>;
}

export class SessionManager {
  private queue: AsyncQueuer<() => Promise<void>>;
  private deps: SessionDependencies;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly DEBOUNCE_MS = 500;

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
   * Main entry point for events.
   * @param type - 'switch': Debounced tab switch/nav. 'alarm': Periodic save. 'idle': State change(windows/system).
   * @param data - Snapshot of the target state (e.g. the new URL to track).
   *               For 'alarm', this can be omitted to imply "keep tracking current".
   */
  handleEvent(type: "switch" | "alarm" | "idle", data?: { url: string | null; title?: string }) {
    if (type === "switch") {
      // Debounce logic for rapid tab switching
      if (this.debounceTimer) clearTimeout(this.debounceTimer);

      this.debounceTimer = setTimeout(() => {
        this.queue.addItem(() => this._executeTransition(data));
      }, this.DEBOUNCE_MS);
    } else if (type === "alarm") {
      // Alarm needs to resolve the *current* session inside the lock to decide what to do
      this.queue.addItem(() => this._executeAlarmTick());
    } else {
      // Idle events (immediate)
      this.queue.addItem(() => this._executeTransition(data));
    }
  }

  /**
   * Standard transition: End current session -> Start new session (if data.url exists)
   */
  private async _executeTransition(data?: { url: string | null; title?: string }) {
    try {
      // 1. End current session
      const session = await this.deps.storage.getValue();
      await this._endSession(session);

      // 2. Start new session if a valid URL is provided
      if (typeof data?.url === "string" && data.url.length > 0) {
        await this._startSession(data.url, data.title);
      }
    } catch (error) {
      console.error("SessionManager: Error in transition", error);
    }
  }

  /**
   * Alarm Tick: End current session -> Restart same session
   */
  private async _executeAlarmTick() {
    try {
      const session = await this.deps.storage.getValue();

      // Only tick if we have a valid active session
      if (session.url) {
        // End current
        await this._endSession(session);
        // Restart same
        await this._startSession(session.url, session.title);
      }
    } catch (error) {
      console.error("SessionManager: Error in alarm tick", error);
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
      await this.deps.recordActivity(session.url, finalDuration, session.title);
    }

    // Clear from storage
    await this.deps.storage.removeValue();
    console.log("SessionManager: Tracking ended:", session.url);
  }

  private async _startSession(url: string, title?: string) {
    const newSession: ActiveSessionData = {
      url,
      title: title ?? "",
      startTime: Date.now(),
      lastUpdateTime: Date.now(),
      duration: 0,
    };
    await this.deps.storage.setValue(newSession);
    console.log("SessionManager: Tracking started:", url);
  }
}
