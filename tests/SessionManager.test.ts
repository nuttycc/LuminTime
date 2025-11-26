import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  SessionManager,
  SessionDependencies,
  ActiveSessionData,
} from "../src/utils/SessionManager";

describe("SessionManager", () => {
  let manager: SessionManager;
  let mockStorageData: ActiveSessionData;
  let mockStorage: SessionDependencies["storage"];
  let mockRecordActivity: ReturnType<typeof vi.fn>;

  // Helper to ensure async queue tasks have processed
  const flushQueue = async () => {
    vi.advanceTimersByTime(1000); // Trigger debounce
    // Allow promises to settle
    await new Promise((resolve) => {
      vi.useRealTimers();
      setTimeout(() => {
        vi.useFakeTimers();
        resolve(true);
      }, 10);
    });
  };

  beforeEach(() => {
    vi.useFakeTimers();

    mockStorageData = {
      url: "",
      title: "",
      startTime: 0,
      lastUpdateTime: 0,
      duration: 0,
      isStopped: true,
    };

    mockStorage = {
      getValue: vi.fn(async () => ({ ...mockStorageData })),
      setValue: vi.fn(async (val) => {
        mockStorageData = val;
      }),
      removeValue: vi.fn(async () => {
        mockStorageData = {
          url: "",
          title: "",
          startTime: 0,
          lastUpdateTime: 0,
          duration: 0,
          isStopped: true,
        };
      }),
    };

    mockRecordActivity = vi.fn(async (url, dur) => {
      console.log(`[Mock] recordActivity: ${url} (${dur}ms)`);
      return Promise.resolve();
    });

    manager = new SessionManager({
      storage: mockStorage,
      recordActivity: mockRecordActivity,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should start tracking when a switch event occurs", async () => {
    manager.handleEvent("switch", { url: "https://example.com", title: "Example" });
    await flushQueue();
    expect(mockStorage.setValue).toHaveBeenCalledTimes(1);
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com",
        title: "Example",
        isStopped: false,
      }),
    );
  });

  it("should end previous session and record activity when switching to a new url", async () => {
    const startTime = Date.now();
    mockStorageData = {
      url: "https://old.com",
      title: "Old",
      startTime: startTime - 10000,
      lastUpdateTime: startTime - 10000,
      duration: 5000,
      isStopped: false,
    };

    manager.handleEvent("switch", { url: "https://new.com", title: "New" });
    vi.setSystemTime(startTime + 2000);
    await flushQueue();

    expect(mockRecordActivity).toHaveBeenCalledWith("https://old.com", expect.any(Number), "Old");
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://new.com",
        title: "New",
      }),
    );
  });

  it("should debounce rapid tab switches", async () => {
    manager.handleEvent("switch", { url: "https://a.com" });
    vi.advanceTimersByTime(200);
    manager.handleEvent("switch", { url: "https://b.com" });
    vi.advanceTimersByTime(200);
    manager.handleEvent("switch", { url: "https://c.com" });
    vi.advanceTimersByTime(600);
    await flushQueue();

    expect(mockStorage.setValue).toHaveBeenCalledTimes(1);
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://c.com",
      }),
    );
  });

  it("should handle alarm ticks by restarting the current session", async () => {
    mockStorageData = {
      url: "https://active.com",
      title: "Active",
      startTime: 1000,
      lastUpdateTime: 1000,
      duration: 0,
      isStopped: false,
    };

    manager.handleEvent("alarm");
    await flushQueue();

    expect(mockRecordActivity).toHaveBeenCalledWith(
      "https://active.com",
      expect.any(Number),
      "Active",
    );
    expect(mockStorage.removeValue).toHaveBeenCalled();
    expect(mockStorage.setValue).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://active.com",
        title: "Active",
      }),
    );
  });

  it("should stop tracking when idle event occurs", async () => {
    mockStorageData = {
      url: "https://active.com",
      title: "Active",
      startTime: 1000,
      lastUpdateTime: 1000,
      duration: 0,
      isStopped: false,
    };

    manager.handleEvent("idle", { url: null });
    await flushQueue();

    expect(mockRecordActivity).toHaveBeenCalled();
    expect(mockStorage.removeValue).toHaveBeenCalled();
    expect(mockStorage.setValue).not.toHaveBeenCalled();
  });

  it("should handle concurrent events serially without race conditions", async () => {
    mockStorageData = {
      url: "https://initial.com",
      title: "Initial",
      startTime: 1000,
      lastUpdateTime: 1000,
      duration: 0,
      isStopped: false,
    };

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
    );
    expect(mockRecordActivity).toHaveBeenNthCalledWith(2, "https://a.com", expect.any(Number), "A");

    expect(mockStorage.setValue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        url: "https://b.com",
        title: "B",
      }),
    );
  });
});
