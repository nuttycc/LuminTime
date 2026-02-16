<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { motion, AnimatePresence, stagger } from "motion-v";
import { useDateRange, type ViewMode } from "@/composables/useDateRange";
import { getHistoryLogs } from "@/db/service";
import type { IHistoryLog } from "@/db/types";
import DateNavigator from "@/components/DateNavigator.vue";
import { formatDate, parseDate } from "@/utils/dateUtils";

const contentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren: stagger(0.06, { ease: [0.4, 0, 0.2, 1] }) },
  },
};

const groupVariants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const route = useRoute();
const router = useRouter();
const { view, startDate, endDate, label, next, prev, goToday, isToday, canNext } = useDateRange();

const hostname = computed(() => route.query.hostname as string | undefined);
const path = computed(() => route.query.path as string | undefined);

const logs = ref<IHistoryLog[]>([]);

const fetchData = async () => {
  try {
    logs.value = await getHistoryLogs(startDate.value, endDate.value, hostname.value, path.value);
  } catch (e) {
    console.error("Failed to fetch history", e);
  }
};

watch([startDate, endDate, hostname, path], fetchData, { immediate: true });

const title = computed(() => {
  if (path.value) return "Page History";
  if (hostname.value) return "Site History";
  return "History";
});

const subtitle = computed(() => {
  if (path.value) return path.value;
  if (hostname.value) return hostname.value;
  return "All Activity";
});

const goBack = () => {
  router.back();
};

const updateView = (v: ViewMode) => {
  view.value = v;
};

const formatTime = (ts: number) => {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
};

const groupedLogs = computed(() => {
  const groups: Record<string, IHistoryLog[]> = {};
  logs.value.forEach((log) => {
    const d = log.date;
    if (!groups[d]) groups[d] = [];
    groups[d].push(log);
  });
  // Sort keys desc
  return Object.keys(groups)
    .sort()
    .reverse()
    .map((date) => ({
      date,
      logs: groups[date],
    }));
});

const formatDateLabel = (d: string) => {
  const dateObj = parseDate(d);
  const today = new Date();
  const todayStr = formatDate(today);
  if (d === todayStr) return "Today";
  return dateObj.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const formatLogPath = (log: IHistoryLog) => {
  return hostname.value ? log.path : `${log.hostname}${log.path}`;
};

const eventSourceConfig: Record<string, { icon: string; tip: string }> = {
  tab_activated: { icon: "⇥", tip: "Tab Switch" },
  navigation: { icon: "↻", tip: "Web Navigation" },
  window_focus: { icon: "◎", tip: "Window Focus" },
  idle_resume: { icon: "▶", tip: "Idle Resume" },
  alarm: { icon: "⏱", tip: "Periodic Save" },
};
</script>

<template>
  <div class="flex flex-col min-h-0 bg-base-100">
    <!-- Header -->
    <div class="navbar bg-base-100 sticky top-0 z-30 border-b border-base-200 min-h-12 px-2">
      <div class="navbar-start w-1/4">
        <div class="tooltip tooltip-right" data-tip="Back">
          <button class="btn btn-ghost btn-circle btn-sm" aria-label="Go back" @click="goBack">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        </div>
      </div>
      <div class="navbar-center w-2/4 justify-center flex-col gap-0.5">
        <h1 class="text-sm font-bold truncate max-w-37.5">
          {{ title }}
        </h1>
        <div class="text-[10px] text-base-content/60 font-mono truncate max-w-50">
          {{ subtitle }}
        </div>
      </div>
      <div class="navbar-end w-1/4"></div>
    </div>

    <!-- Date Navigator -->
    <DateNavigator
      :view="view"
      :label="label"
      :can-next="canNext"
      :is-today="isToday"
      @update:view="updateView"
      @prev="prev"
      @next="next"
      @today="goToday"
    />

    <!-- List -->
    <div class="flex-1 p-4">
      <AnimatePresence mode="wait">
        <motion.div
          v-if="logs.length === 0"
          key="empty"
          class="flex flex-col items-center justify-center py-10 gap-2 opacity-60"
          :initial="{ opacity: 0 }"
          :animate="{ opacity: 1 }"
          :exit="{ opacity: 0 }"
        >
          <svg
            class="size-12 text-base-content/30"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div class="text-sm font-medium">No history recorded</div>
          <div class="text-xs">No activity found for this period.</div>
        </motion.div>

        <motion.div
          v-else
          key="logs"
          class="flex flex-col gap-4"
          :variants="contentVariants"
          initial="hidden"
          animate="show"
        >
          <motion.div
            v-for="group in groupedLogs"
            :key="group.date"
            class="flex flex-col gap-1"
            :variants="groupVariants"
          >
            <div
              class="sticky top-0 bg-base-100/95 backdrop-blur-sm z-10 px-2 py-1 text-xs font-bold text-base-content/50 uppercase border-b border-base-200"
            >
              {{ formatDateLabel(group.date) }}
            </div>

            <div
              v-for="log in group.logs"
              :key="log.id || log.startTime"
              class="flex items-center gap-3 p-2 hover:bg-base-200/50 rounded-box transition-colors text-left border-b border-base-100 last:border-0"
            >
              <div class="flex items-center gap-1.5 shrink-0 opacity-60">
                <div
                  v-if="log.eventSource && eventSourceConfig[log.eventSource]"
                  class="tooltip tooltip-right"
                  :data-tip="eventSourceConfig[log.eventSource].tip"
                >
                  <span class="text-[10px]">{{ eventSourceConfig[log.eventSource].icon }}</span>
                </div>
                <div class="font-mono text-xs font-bold w-10">{{ formatTime(log.startTime) }}</div>
              </div>

              <div class="flex flex-col flex-1 min-w-0">
                <div class="font-medium text-xs truncate" :title="log.title || 'Untitled'">
                  {{ log.title || "Untitled" }}
                </div>
                <div class="text-[10px] text-base-content/50 truncate font-mono" :title="log.path">
                  {{ formatLogPath(log) }}
                </div>
              </div>

              <div class="font-mono text-xs font-bold opacity-80 shrink-0">
                {{ prettyMs(log.duration, { compact: true }) }}
              </div>
            </div>
          </motion.div>

          <div v-if="logs.length >= 2000" class="text-center py-4 text-xs text-base-content/50">
            History limit reached (2000 items). Refine date range to see more.
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  </div>
</template>
