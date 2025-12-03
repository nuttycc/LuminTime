import { ref, onMounted, onUnmounted, computed } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import type { ActiveSessionData } from '@/utils/SessionManager';

export const ACTIVE_SESSION_KEY = "session:activeSession";

export function useActiveSession() {
  const session = ref<ActiveSessionData | null>(null);
  const now = ref(Date.now());

  // Update 'now' every second to drive duration calculation
  const { pause, resume } = useIntervalFn(() => {
    now.value = Date.now();
  }, 1000);

  const activeDuration = computed(() => {
    if (!session.value || !session.value.url) return 0;
    // Calculation: stored duration + (current time - last update time)
    // Ensure we don't show negative if clocks drift slightly, though unlikely with Date.now()
    const elapsed = Math.max(0, now.value - session.value.lastUpdateTime);
    return (session.value.duration || 0) + elapsed;
  });

  const isActive = computed(() => {
    return !!session.value && !!session.value.url;
  });

  const unwatch = ref<(() => void) | null>(null);

  onMounted(async () => {
    // Initial fetch
    session.value = await storage.getItem<ActiveSessionData>(ACTIVE_SESSION_KEY);

    // Watch for changes (from background script)
    unwatch.value = storage.watch<ActiveSessionData>(ACTIVE_SESSION_KEY, (newValue) => {
      session.value = newValue;
      // Sync 'now' to prevent jumps when background updates lastUpdateTime
      now.value = Date.now();
    });

    resume();
  });

  onUnmounted(() => {
    if (unwatch.value) unwatch.value();
    pause();
  });

  return {
    session,
    activeDuration,
    isActive
  };
}
