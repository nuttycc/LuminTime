import { liveQuery } from "dexie";
import { ref, watch, onMounted, onUnmounted, onScopeDispose, type Ref, type ComputedRef } from "vue";

type DexieSubscription = { unsubscribe: () => void };

function createSubscriptionManager<T>(querier: () => Promise<T>, onNext: (result: T) => void) {
  let subscription: DexieSubscription | null = null;

  function teardown(): void {
    if (!subscription) {
      return;
    }

    subscription.unsubscribe();
    subscription = null;
  }

  function subscribe(): void {
    teardown();

    subscription = liveQuery(querier).subscribe({
      next: onNext,
      error: (error: Error) => {
        console.error("Dexie live query error:", error);
      },
    });
  }

  return {
    subscribe,
    teardown,
  };
}

/**
 * Convert Dexie liveQuery to Vue reactive ref with dependency tracking
 * @param querier Function that returns a Promise with the query result
 * @param deps Optional dependency array to trigger re-queries
 * @returns Ref with the query result
 */
export function useDexieLiveQuery<T>(
  querier: () => Promise<T>,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T | undefined> {
  const value = ref<T>();
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });
  let stopWatch: (() => void) | null = null;

  onMounted(() => {
    subscribe();

    if (deps !== undefined) {
      const depArray = Array.isArray(deps) ? deps : [deps];
      stopWatch = watch(depArray, () => {
        subscribe();
      });
    }
  });

  onUnmounted(() => {
    if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }

    teardown();
  });

  return value;
}

/**
 * Enhanced version with default value support.
 * Returns `Ref<T>` (never undefined) by providing an initial/fallback value.
 * Re-subscribes automatically when any dep in `deps` changes.
 *
 * @param querier Function that returns a Promise with the query result
 * @param defaultValue Fallback value used before the first query resolves
 * @param deps Reactive dependencies that trigger re-subscription when changed
 */
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  defaultValue: T,
  deps?: (Ref | ComputedRef)[],
): Ref<T> {
  const value = ref<T>(defaultValue) as Ref<T>;
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });
  const canUseIndexedDb = typeof window !== "undefined" && "indexedDB" in window;

  let stopWatch: (() => void) | null = null;

  if (canUseIndexedDb) {
    subscribe();

    if (deps && deps.length > 0) {
      stopWatch = watch(deps, () => {
        subscribe();
      });
    }
  }

  onScopeDispose(() => {
    if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }

    teardown();
  });

  return value;
}
