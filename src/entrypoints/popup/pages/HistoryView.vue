<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { useDateRange } from "@/composables/useDateRange";
import { getHistoryLogs } from "@/db/service";
import type { IHistoryLog } from "@/db/types";
import { formatDate, parseDate } from "@/utils/dateUtils";
import InspectorFooter from "@/components/popup/InspectorFooter.vue";
import InspectorHeader from "@/components/popup/InspectorHeader.vue";
import InspectorIcon from "@/components/popup/InspectorIcon.vue";
import InspectorIconButton from "@/components/popup/InspectorIconButton.vue";
import type { InspectorIconName } from "@/components/popup/iconNames";

const route = useRoute();
const router = useRouter();
const { startDate, endDate } = useDateRange();

const hostname = computed(() => route.query.hostname as string | undefined);

const logs = ref<IHistoryLog[]>([]);

const fetchData = async () => {
  try {
    logs.value = await getHistoryLogs(startDate.value, endDate.value, hostname.value);
  } catch (e) {
    console.error("Failed to fetch history", e);
  }
};

watch([startDate, endDate, hostname], fetchData, { immediate: true });

const title = computed(() => {
  if (hostname.value) return "Site History";
  return "History";
});

const subtitle = computed(() => {
  if (hostname.value) return hostname.value;
  return "All Activity";
});

const goBack = () => {
  router.back();
};

const clearHistoryScope = () => {
  const { hostname: _hostname, ...query } = route.query;
  router.push({ path: "/history", query });
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

const visibleGroups = computed(() =>
  groupedLogs.value.map((group) => ({
    ...group,
    logs: group.logs.slice(0, 8),
  })),
);

const selectedLogKey = ref<number | string | null>(null);

const getLogKey = (log: IHistoryLog) => log.id ?? log.startTime;

watch(
  logs,
  (items) => {
    if (items.length === 0) {
      selectedLogKey.value = null;
      return;
    }

    const stillVisible = items.some((log) => getLogKey(log) === selectedLogKey.value);
    if (!stillVisible) selectedLogKey.value = getLogKey(items[0]);
  },
  { immediate: true },
);

const selectedLog = computed(
  () => logs.value.find((log) => getLogKey(log) === selectedLogKey.value) ?? null,
);

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

const eventSourceConfig: Record<
  string,
  { icon: InspectorIconName; label: string; status: string }
> = {
  tab_activated: { icon: "arrow-right", label: "Tab switch", status: "active" },
  navigation: { icon: "refresh", label: "Navigation", status: "saved" },
  window_focus: { icon: "filter", label: "Window focus", status: "focus" },
  idle_resume: { icon: "clock", label: "Idle resume", status: "idle resume" },
  alarm: { icon: "save", label: "Periodic save", status: "saved" },
};

const getEventSource = (source?: string) => {
  return source ? eventSourceConfig[source] : undefined;
};

const getEventIcon = (source?: string): InspectorIconName => {
  return getEventSource(source)?.icon ?? "clock";
};

const getEventStatus = (source?: string): string => {
  return getEventSource(source)?.status ?? "tracked";
};

const getEventLabel = (source?: string): string => {
  return getEventSource(source)?.label ?? "Activity";
};

const formatEndTime = (log: IHistoryLog) => formatTime(log.startTime + log.duration);
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <InspectorHeader :title="title" :subtitle="subtitle" @back="goBack">
      <template #actions>
        <InspectorIconButton
          v-if="hostname"
          icon="filter-off"
          label="Clear filters"
          @click="clearHistoryScope"
        />
      </template>
    </InspectorHeader>

    <section class="shrink-0 border-b border-base-300 bg-surface-lowest px-3 py-2">
      <div class="flex flex-wrap items-center gap-2">
        <div
          v-if="hostname"
          class="flex min-w-0 items-center gap-1 rounded border border-base-300 bg-surface-low px-2 py-0.5 font-mono text-[11px] leading-4"
        >
          <span class="text-outline">site:</span>
          <span class="truncate">{{ hostname }}</span>
        </div>
        <div
          class="rounded border border-base-300 bg-surface-low px-2 py-0.5 font-mono text-[11px] leading-4"
        >
          <span class="text-outline">source:</span> all
        </div>
        <div
          class="rounded border border-base-300 bg-surface-low px-2 py-0.5 font-mono text-[11px] leading-4"
        >
          <span class="text-outline">limit:</span> 2000
        </div>
      </div>
      <button
        v-if="hostname"
        class="mt-2 rounded px-1 py-0.5 text-[11px] leading-4 text-primary transition-colors hover:bg-primary/10"
        @click="clearHistoryScope"
      >
        Switch to all activity
      </button>
    </section>

    <main class="custom-scrollbar relative flex-1 overflow-y-auto overflow-x-hidden p-3">
      <div v-if="logs.length === 0" class="px-3 py-10 text-center">
        <InspectorIcon name="clock" size="mx-auto mb-3 size-10 text-outline" />
        <div class="text-sm font-medium">No history recorded</div>
        <div class="mt-1 text-xs leading-5 text-base-content/60">
          No activity was found for this period.
        </div>
      </div>

      <div v-else class="relative pl-12">
        <div class="absolute top-0 bottom-0 left-10.75 w-px bg-base-300"></div>

        <section v-for="group in visibleGroups" :key="group.date" class="relative mb-3 last:mb-0">
          <div
            class="sticky top-0 z-10 -mx-3 mb-2 border-y border-base-300 bg-base-100/95 px-3 py-1 text-[10px] font-bold tracking-wider text-outline uppercase"
          >
            {{ formatDateLabel(group.date) }}
          </div>

          <article
            v-for="log in group.logs"
            :key="log.id || log.startTime"
            class="group relative -ml-12 grid cursor-pointer grid-cols-[40px_1fr] gap-3 rounded border border-transparent px-1 py-1.5 transition-colors hover:border-base-300 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="{ 'border-base-300 bg-surface-low': selectedLog?.startTime === log.startTime }"
            role="button"
            tabindex="0"
            @click="selectedLogKey = getLogKey(log)"
            @keydown.enter="selectedLogKey = getLogKey(log)"
            @keydown.space.prevent="selectedLogKey = getLogKey(log)"
          >
            <div class="pt-0.5 text-right font-mono text-[11px] leading-4 text-outline">
              {{ formatTime(log.startTime) }}
            </div>

            <div class="relative min-w-0 pl-4">
              <span
                class="absolute top-1.5 -left-1 flex size-2 items-center justify-center rounded-full border border-base-100"
                :class="selectedLog?.startTime === log.startTime ? 'bg-primary' : 'bg-outline'"
              ></span>

              <div class="flex min-w-0 items-center gap-1.5">
                <InspectorIcon
                  :name="getEventIcon(log.eventSource)"
                  size="size-3.5 shrink-0 text-primary"
                />
                <span class="truncate text-xs font-semibold leading-4">
                  {{ log.title || "Untitled" }}
                </span>
                <span
                  class="ml-auto shrink-0 rounded bg-surface-high px-1 font-mono text-[10px] leading-4 text-outline"
                >
                  {{ prettyMs(log.duration, { compact: true }) }}
                </span>
              </div>

              <div class="mt-0.5 truncate font-mono text-[10px] leading-4 text-outline">
                {{ formatLogPath(log) }}
              </div>
              <div class="mt-1 flex items-center gap-1">
                <span
                  class="rounded bg-surface-high px-1 font-mono text-[9px] leading-3 text-outline"
                >
                  {{ getEventLabel(log.eventSource) }}
                </span>
                <span
                  class="rounded border border-primary/30 px-1 font-mono text-[9px] leading-3 text-primary"
                >
                  {{ getEventStatus(log.eventSource) }}
                </span>
              </div>

              <div
                v-if="selectedLog?.startTime === log.startTime"
                class="mt-2 rounded border border-base-300 bg-base-100 p-2"
              >
                <div class="mb-1 flex items-center justify-between border-b border-base-300 pb-1">
                  <span class="text-[9px] font-bold tracking-wider text-outline uppercase">
                    Details
                  </span>
                  <span class="font-mono text-[10px] leading-3 text-base-content">
                    {{ formatTime(log.startTime) }} - {{ formatEndTime(log) }}
                  </span>
                </div>
                <div class="text-[9px] leading-3 text-outline">Captured URL</div>
                <div class="mt-0.5 truncate font-mono text-[10px] leading-4 text-primary">
                  {{ log.hostname }}{{ log.path }}
                </div>
              </div>
            </div>
          </article>
        </section>

        <div v-if="logs.length >= 2000" class="py-3 text-center text-xs text-outline">
          Showing latest 2000 events. Refine the date range to see more.
        </div>
      </div>
    </main>

    <InspectorFooter :text="`${logs.length} events - Local-only`" icon="database" />
  </div>
</template>
