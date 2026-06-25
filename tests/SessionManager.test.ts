import { describe, it, expect, vi, beforeEach, afterEach } from "vite-plus/test";
import {
  SessionManager,
  type SessionDependencies,
  type ActiveSessionData,
} from "../src/utils/SessionManager";

describe("SessionManager", () => {
  const BASE_TIME = new Date(2025, 0, 15, 10, 0, 0).getTime();
  const DEBOUNCE_MS = 500;

  let manager: SessionManager;
  let mockStorageData: ActiveSessionData;
  let mockStorage: SessionDependencies["storage"];
  let mockRecordActivity: SessionDependencies["recordActivity"];
  let mockAlarmGet: ReturnType<typeof vi.fn>;
  let mockAlarmCreate: ReturnType<typeof vi.fn>;
  let mockAlarmClear: ReturnType<typeof vi.fn>;

  const emptySession = (): ActiveSessionData => ({
    url: "",
    title: "",
    startTime: 0,
    lastUpdateTime: 0,
    duration: 0,
  });

  const createManager = (overrides: Partial<SessionDependencies> = {}) =>
    new SessionManager({
      storage: mockStorage,
      recordActivity: mockRecordActivity,
      alarmName: "test-alarm",
      alarmPeriodInMinutes: 1,
      ...overrides,
    });

  const setStoredSession = (session: ActiveSessionData) => {
    mockStorageData = session;
  };

  const flushMicrotasks = async () => {
    for (let i = 0; i < 10; i++) {
      await Promise.resolve();
    }
  };

  const flushDebouncedQueue = async () => {
    await vi.advanceTimersByTimeAsync(DEBOUNCE_MS);
    await flushMicrotasks();
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(BASE_TIME);

    mockAlarmGet = vi.fn(() => Promise.resolve(undefined));
    mockAlarmCreate = vi.fn(() => Promise.resolve());
    mockAlarmClear = vi.fn(() => Promise.resolve(true));
    vi.stubGlobal("browser", {
      alarms: {
        get: mockAlarmGet,
        create: mockAlarmCreate,
        clear: mockAlarmClear,
      },
    });

    mockStorageData = emptySession();

    mockStorage = {
      getValue: vi.fn(() => Promise.resolve({ ...mockStorageData })),
      setValue: vi.fn((val) => {
        mockStorageData = val;
        return Promise.resolve();
      }),
      removeValue: vi.fn(() => {
        mockStorageData = emptySession();
        return Promise.resolve();
      }),
    };

    mockRecordActivity = vi.fn((url: string, duration: number, _title?: string) => {
      console.log(`[Mock] recordActivity: ${url} (${duration}ms)`);
      return Promise.resolve();
    }) as SessionDependencies["recordActivity"];

    manager = createManager();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("should start tracking when a switch event occurs", async () => {
    manager.handleEvent("switch", { url: "https://example.com", title: "Example" });
    await flushDebouncedQueue();
    expect(mockStorage.setValue).toHaveBeenCalledTimes(1);
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        title: "Example",
      }),
    );
  });

  it("should end previous session and record activity when switching to a new url", async () => {
    setStoredSession({
      url: "https://old.com",
      title: "Old",
      startTime: BASE_TIME - 10000,
      lastUpdateTime: BASE_TIME - 10000,
      duration: 5000,
    });

    manager.handleEvent("switch", { url: "https://new.com", title: "New" });
    await flushDebouncedQueue();

    expect(mockRecordActivity).toHaveBeenCalledWith(
      "https://old.com",
      5_000 + 10_000 + DEBOUNCE_MS,
      "Old",
      BASE_TIME - 10000,
      undefined,
    );
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://new.com",
        title: "New",
      }),
    );
  });

  it("should debounce rapid tab switches", async () => {
    manager.handleEvent("switch", { url: "https://a.com" });
    await vi.advanceTimersByTimeAsync(200);
    manager.handleEvent("switch", { url: "https://b.com" });
    await vi.advanceTimersByTimeAsync(200);
    manager.handleEvent("switch", { url: "https://c.com" });
    await vi.advanceTimersByTimeAsync(600);
    await flushMicrotasks();

    expect(mockStorage.setValue).toHaveBeenCalledTimes(1);
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://c.com",
      }),
    );
    expect(mockRecordActivity).not.toHaveBeenCalled();
  });

  it("should handle alarm ticks by restarting the current session", async () => {
    setStoredSession({
      url: "https://active.com",
      title: "Active",
      startTime: BASE_TIME,
      lastUpdateTime: BASE_TIME,
      duration: 0,
    });
    vi.setSystemTime(BASE_TIME + 60_000);

    manager.handleEvent("alarm");
    await flushMicrotasks();

    expect(mockRecordActivity).toHaveBeenCalledWith(
      "https://active.com",
      60_000,
      "Active",
      BASE_TIME,
      undefined,
    );
    expect(mockStorage.removeValue).toHaveBeenCalled();
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://active.com",
        title: "Active",
        startTime: BASE_TIME + 60_000,
        lastUpdateTime: BASE_TIME + 60_000,
        eventSource: "alarm",
      }),
    );
  });

  it("should stop tracking when idle event occurs", async () => {
    setStoredSession({
      url: "https://active.com",
      title: "Active",
      startTime: BASE_TIME,
      lastUpdateTime: BASE_TIME,
      duration: 0,
    });
    vi.setSystemTime(BASE_TIME + 30_000);

    manager.handleEvent("idle", { url: null });
    await flushMicrotasks();

    expect(mockRecordActivity).toHaveBeenCalledWith(
      "https://active.com",
      30_000,
      "Active",
      BASE_TIME,
      undefined,
    );
    expect(mockStorage.removeValue).toHaveBeenCalled();
    expect(mockStorage.setValue).not.toHaveBeenCalled();
  });

  it("should start a new session when active state resumes with a url", async () => {
    vi.setSystemTime(BASE_TIME + 45_000);

    manager.handleEvent("idle", {
      url: "https://resume.com",
      title: "Resume",
      eventSource: "idle_resume",
    });
    await flushMicrotasks();

    expect(mockRecordActivity).not.toHaveBeenCalled();
    expect(mockStorage.setValue).toHaveBeenCalledWith({
      url: "https://resume.com",
      title: "Resume",
      startTime: BASE_TIME + 45_000,
      lastUpdateTime: BASE_TIME + 45_000,
      duration: 0,
      eventSource: "idle_resume",
    });
  });

  it("should not start tracking a blocked url", async () => {
    manager = createManager({ isUrlBlocked: () => true });

    manager.handleEvent("idle", {
      url: "https://blocked.com",
      title: "Blocked",
      eventSource: "window_focus",
    });
    await flushMicrotasks();

    expect(mockRecordActivity).not.toHaveBeenCalled();
    expect(mockStorage.setValue).not.toHaveBeenCalled();
    expect(mockAlarmCreate).not.toHaveBeenCalled();
  });

  it("should handle concurrent events serially without race conditions", async () => {
    setStoredSession({
      url: "https://initial.com",
      title: "Initial",
      startTime: 1000,
      lastUpdateTime: 1000,
      duration: 0,
    });

    const originalGetValue = mockStorage.getValue;
    mockStorage.getValue = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 50));
      return originalGetValue();
    });

    // Event 1: Stop Initial, Start A
    manager.handleEvent("idle", { url: "https://a.com", title: "A" });
    // Event 2: Stop A, Start B
    manager.handleEvent("idle", { url: "https://b.com", title: "B" });

    // Manually advance time to process the queue without switching to Real timers (which breaks the mock delay)

    // 1. Advance for Task 1 IO (50ms) + Execution
    await vi.advanceTimersByTimeAsync(60);

    // 2. Advance for Task 2 IO (50ms) + Execution
    await vi.advanceTimersByTimeAsync(60);

    // Verify
    expect(mockRecordActivity).toHaveBeenCalledTimes(2);
    expect(mockRecordActivity).toHaveBeenNthCalledWith(
      1,
      "https://initial.com",
      expect.any(Number),
      "Initial",
      expect.any(Number),
      undefined,
    );
    expect(mockRecordActivity).toHaveBeenNthCalledWith(
      2,
      "https://a.com",
      expect.any(Number),
      "A",
      expect.any(Number),
      undefined,
    );

    expect(mockStorage.setValue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "https://b.com",
        title: "B",
      }),
    );
  });
});
