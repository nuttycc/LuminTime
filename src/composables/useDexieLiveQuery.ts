import { liveQuery } from "dexie";
import { onScopeDispose, type ComputedRef, type Ref, ref, watch } from "vue";
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

export function useLiveQuery<T>(
  querier: () => Promise<T>,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T | undefined>;
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  defaultValue: T,
  deps?: Ref | ComputedRef | unknown[],
): Ref<T>;
export function useLiveQuery<T>(
  querier: () => Promise<T>,
  defaultValueOrDeps?: T | Ref | ComputedRef | unknown[],
  maybeDeps?: Ref | ComputedRef | unknown[],
): Ref<T | undefined> | Ref<T> {
  const hasDefault = maybeDeps !== undefined || !isDepsLike(defaultValueOrDeps);
  const defaultValue = hasDefault ? (defaultValueOrDeps as T) : undefined;
  const deps = hasDefault
    ? maybeDeps
    : (defaultValueOrDeps as Ref | ComputedRef | unknown[] | undefined);

  const value = ref<T | undefined>(defaultValue) as Ref<T | undefined>;
  const hasIndexedDb = isClient && "indexedDB" in globalThis;

  if (!hasIndexedDb) {
    return value;
  }

  const dependencies = deps === undefined ? [] : toArray(deps);
  const { subscribe, teardown } = createSubscriptionManager(querier, (result) => {
    value.value = result;
  });

  let stopWatch: (() => void) | null = null;

  subscribe();

  if (dependencies.length > 0) {
    stopWatch = watch(dependencies, subscribe);
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

function isDepsLike(val: unknown): val is Ref | ComputedRef | unknown[] {
  if (val === undefined) return true;
  if (Array.isArray(val)) return true;
  if (val !== null && typeof val === "object" && "value" in val) return true;
  return false;
}

/** @deprecated Use `useLiveQuery` instead. */
export const useDexieLiveQuery = useLiveQuery;
