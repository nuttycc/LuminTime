import { liveQuery } from "dexie";
import { ref, watch, onMounted, onUnmounted, onScopeDispose, type Ref, type ComputedRef } from "vue";

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
  let subscription: { unsubscribe: () => void } | null = null;

  const subscribe = () => {
    subscription = liveQuery(querier).subscribe({
      next: (result) => {
        value.value = result;
      },
      error: (error: Error) => {
        console.error("Dexie live query error:", error);
      },
    });
  };

  onMounted(() => {
    subscribe();

    if (deps !== undefined) {
      const depArray = Array.isArray(deps) ? deps : [deps];
      watch(depArray, () => {
        if (subscription) {
          subscription.unsubscribe();
        }
        subscribe();
      });
    }
  });

  onUnmounted(() => {
    if (subscription) {
      subscription.unsubscribe();
    }
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
  let subscription: { unsubscribe: () => void } | null = null;
  const canUseIndexedDb = typeof window !== "undefined" && "indexedDB" in window;

  const subscribe = () => {
    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
    subscription = liveQuery(querier).subscribe({
      next: (result) => {
        value.value = result;
      },
      error: (error: Error) => {
        console.error("Dexie live query error:", error);
      },
    });
  };

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

    if (subscription) {
      subscription.unsubscribe();
      subscription = null;
    }
  });

  return value;
}
