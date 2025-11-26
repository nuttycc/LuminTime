import { liveQuery, type Observable } from "dexie";
import { ref, watch, onMounted, onUnmounted, type Ref, type ComputedRef } from "vue";

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

  const createLiveQuery = () => {
    return liveQuery(querier);
  };

  const subscribe = () => {
    const observable$ = createLiveQuery();
    subscription = observable$.subscribe({
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

    // Watch dependency changes
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
