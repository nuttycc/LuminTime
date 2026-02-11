import { liveQuery } from "dexie";
import { onMounted, onScopeDispose, type ComputedRef, type Ref, ref, watch } from "vue";
import { isClient, toArray } from "@vueuse/shared";

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

  return { subscribe, teardown };
}

export function useDexieLiveQuery<T>(
  querier: () => Promise<T>,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T | undefined> {
  const value = ref<T>();
  const hasIndexedDb = isClient && "indexedDB" in globalThis;

  if (!hasIndexedDb) {
    return value;
  }

  const dependencies = deps === undefined ? [] : toArray(deps);
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });

  let stopWatch: (() => void) | null = null;

  onMounted(() => {
    subscribe();

    if (dependencies.length > 0) {
      stopWatch = watch(dependencies, subscribe);
    }
  });

  onScopeDispose(() => {
    if (stopWatch) {
      stopWatch();
      stopWatch = null;
    }

    teardown();
  });

  return value;
}

export function useLiveQuery<T>(
  querier: () => Promise<T>,
  defaultValue: T,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T> {
  const value = ref<T>(defaultValue) as Ref<T>;
  const hasIndexedDb = isClient && "indexedDB" in globalThis;
  const dependencies = deps === undefined ? [] : toArray(deps);
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });

  let stopWatch: (() => void) | null = null;

  if (hasIndexedDb) {
    subscribe();

    if (dependencies.length > 0) {
      stopWatch = watch(dependencies, subscribe);
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
