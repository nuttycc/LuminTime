import { liveQuery } from "dexie";
import { onMounted, onScopeDispose, type ComputedRef, type Ref, ref, watch } from "vue";

type DexieSubscription = { unsubscribe: () => void };

type WatchDependency = Ref | ComputedRef;

function toWatchDependencies(deps?: Ref | ComputedRef | unknown[]): WatchDependency[] {
  if (deps === undefined) {
    return [];
  }

  if (Array.isArray(deps)) {
    return deps.filter((dep): dep is WatchDependency => typeof dep === "object" && dep !== null);
  }

  return [deps];
}

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

function canUseIndexedDb(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

export function useDexieLiveQuery<T>(
  querier: () => Promise<T>,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T | undefined> {
  const value = ref<T>();
  const dependencies = toWatchDependencies(deps);
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
  deps?: WatchDependency[],
): Ref<T> {
  const value = ref<T>(defaultValue) as Ref<T>;
  const dependencies = deps ?? [];
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });

  let stopWatch: (() => void) | null = null;

  if (canUseIndexedDb()) {
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
