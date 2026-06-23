<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { useLiveQuery } from "@/composables/useDexieLiveQuery";
import { getWeeklyInsights, type WeeklyInsights, type SiteComparison } from "@/db/insights";
import { addDays, formatDate, getStartOfWeek, getEndOfWeek, parseDate } from "@/utils/dateUtils";
import InspectorFooter from "@/components/popup/InspectorFooter.vue";
import InspectorHeader from "@/components/popup/InspectorHeader.vue";
import InspectorIcon from "@/components/popup/InspectorIcon.vue";
import InspectorIconButton from "@/components/popup/InspectorIconButton.vue";

const router = useRouter();

const today = new Date();
const currentWeekStart = formatDate(getStartOfWeek(today));
const selectedWeekStart = ref(currentWeekStart);

const weekStart = computed(() => parseDate(selectedWeekStart.value));
const weekEnd = computed(() => getEndOfWeek(weekStart.value));
const startStr = computed(() => formatDate(weekStart.value));
const endStr = computed(() => formatDate(weekEnd.value));
const isCurrentWeek = computed(() => selectedWeekStart.value === currentWeekStart);
const canGoNextWeek = computed(() => selectedWeekStart.value < currentWeekStart);

const defaultInsights: WeeklyInsights = {
  thisWeekTotal: 0,
  lastWeekTotal: 0,
  changePercent: 0,
  dailyTrend: [],
  heatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
  topSitesComparison: [],
};

const insights = useLiveQuery<WeeklyInsights>(
  () => getWeeklyInsights(startStr.value, endStr.value),
  defaultInsights,
  [startStr, endStr],
);

const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];
const hourLabels = [0, 4, 8, 12, 16, 20];

const heatmapBlocks = computed(() =>
  insights.value.heatmap.map((day) =>
    hourLabels.map((hour) => day.slice(hour, hour + 4).reduce((sum, value) => sum + value, 0)),
  ),
);

const maxHeatmapBlock = computed(() => {
  let max = 0;
  for (const day of heatmapBlocks.value) {
    for (const value of day) max = Math.max(max, value);
  }
  return max;
});

const getHeatmapStyle = (value: number) => {
  if (value <= 0 || maxHeatmapBlock.value === 0) {
    return { backgroundColor: "#1d2021" };
  }

  const alpha = Math.max(0.18, Math.min(1, value / maxHeatmapBlock.value));
  return { backgroundColor: `rgba(45, 212, 191, ${alpha})` };
};

// Site comparison helpers
const getSiteChangeText = (site: SiteComparison): string => {
  if (site.lastWeek === 0) return "New";
  const pct = Math.abs(Math.round(site.changePercent));
  return site.changePercent >= 0 ? `↑${pct}%` : `↓${pct}%`;
};

const siteMovement = computed(() => insights.value.topSitesComparison.slice(0, 4));

const maxDailyDuration = computed(() => {
  if (insights.value.dailyTrend.length === 0) return 0;
  return Math.max(...insights.value.dailyTrend.map((item) => item.duration));
});

const getTrendHeight = (duration: number) => {
  if (duration <= 0 || maxDailyDuration.value === 0) return "12%";
  return `${Math.max(18, Math.round((duration / maxDailyDuration.value) * 100))}%`;
};

const peakBlockLabel = computed(() => {
  let bestDay = 0;
  let bestHourIndex = 0;
  let bestValue = 0;

  heatmapBlocks.value.forEach((day, dayIndex) => {
    day.forEach((value, hourIndex) => {
      if (value > bestValue) {
        bestDay = dayIndex;
        bestHourIndex = hourIndex;
        bestValue = value;
      }
    });
  });

  const startHour = hourLabels[bestHourIndex] ?? 0;
  return {
    label: `${dayLabels[bestDay]} ${startHour}:00-${startHour + 4}:00`,
    value: bestValue > 0 ? prettyMs(bestValue, { compact: true }) : "No peak",
  };
});

const totalChangeText = computed(() => {
  if (insights.value.lastWeekTotal === 0) return "No baseline";
  return `${insights.value.changePercent >= 0 ? "+" : ""}${Math.round(insights.value.changePercent)}%`;
});

const goBack = () => {
  router.back();
};

const goToPreviousWeek = () => {
  selectedWeekStart.value = formatDate(addDays(weekStart.value, -7));
};

const goToNextWeek = () => {
  if (!canGoNextWeek.value) return;

  selectedWeekStart.value = formatDate(addDays(weekStart.value, 7));
};

// Week label for header
const weekLabel = computed(() => {
  const start = parseDate(startStr.value);
  const end = parseDate(endStr.value);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(start)} – ${fmt(end)}`;
});

const weekStatusLabel = computed(() => (isCurrentWeek.value ? "This week" : "Past week"));
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <InspectorHeader title="Insights" subtitle="Pattern review" @back="goBack" />

    <section
      class="flex shrink-0 items-center justify-between border-b border-base-300 bg-surface-lowest px-3 py-2"
    >
      <div class="flex items-center gap-1">
        <InspectorIconButton icon="chevron-left" label="Previous week" @click="goToPreviousWeek" />
        <InspectorIconButton
          icon="chevron-right"
          label="Next week"
          :disabled="!canGoNextWeek"
          @click="goToNextWeek"
        />
      </div>
      <div class="flex items-center gap-2">
        <span class="font-mono text-[13px] leading-4">{{ weekLabel }}</span>
        <span class="rounded border border-base-300 bg-surface-low px-2 py-0.5 text-[11px]">
          {{ weekStatusLabel }}
        </span>
      </div>
    </section>

    <main class="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden pb-10">
      <section class="border-b border-base-300 px-3 py-4">
        <div class="mb-3 flex items-center justify-between">
          <span class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
            Active hours
          </span>
          <div class="flex items-center gap-1 text-[10px] leading-3 text-outline">
            <span>Low</span>
            <span class="size-3 rounded-sm bg-primary/15"></span>
            <span class="size-3 rounded-sm bg-primary/40"></span>
            <span class="size-3 rounded-sm bg-primary/70"></span>
            <span class="size-3 rounded-sm bg-primary"></span>
            <span>High</span>
          </div>
        </div>

        <div class="flex gap-2">
          <div class="flex flex-col justify-between pt-5 pb-1 font-mono text-[11px] text-outline">
            <span v-for="day in dayLabels" :key="day">{{ day }}</span>
          </div>
          <div class="min-w-0 flex-1">
            <div class="mb-1 grid grid-cols-6 px-1 font-mono text-[11px] text-outline">
              <span v-for="hour in hourLabels" :key="hour">{{ hour }}</span>
            </div>
            <div class="grid grid-cols-6 gap-1 gap-y-1.5">
              <template v-for="(day, dayIndex) in heatmapBlocks" :key="`day-${dayIndex}`">
                <div
                  v-for="(value, hourIndex) in day"
                  :key="`${dayIndex}-${hourIndex}`"
                  class="h-4 rounded-sm border border-transparent"
                  :class="{ 'border-primary/40': value === maxHeatmapBlock && value > 0 }"
                  :style="getHeatmapStyle(value)"
                  :title="`${dayLabels[dayIndex]} ${hourLabels[hourIndex]}:00 - ${prettyMs(value, { compact: true })}`"
                ></div>
              </template>
            </div>
          </div>
        </div>
      </section>

      <section class="border-b border-base-300 px-3 py-4">
        <div class="mb-2 text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
          Observations
        </div>
        <div class="border-y border-base-300">
          <div class="flex items-center justify-between border-b border-base-300 px-1 py-2">
            <span class="text-[13px] leading-4">Peak block {{ peakBlockLabel.label }}</span>
            <span class="font-mono text-[13px] leading-4 text-primary">
              {{ peakBlockLabel.value }}
            </span>
          </div>
          <div class="flex items-center justify-between border-b border-base-300 px-1 py-2">
            <span class="text-[13px] leading-4">Week-over-week change</span>
            <span
              class="font-mono text-[13px] leading-4"
              :class="insights.changePercent >= 0 ? 'text-primary' : 'text-tertiary'"
            >
              {{ totalChangeText }}
            </span>
          </div>
          <div class="flex items-center justify-between px-1 py-2">
            <span class="text-[13px] leading-4">Sites compared</span>
            <span class="font-mono text-[13px] leading-4 text-outline">
              {{ insights.topSitesComparison.length }}
            </span>
          </div>
        </div>
      </section>

      <section class="px-3 py-4">
        <div class="mb-3 flex items-end justify-between">
          <span class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
            Site movement
          </span>
          <div class="flex h-6 items-end gap-1">
            <div
              v-for="item in insights.dailyTrend"
              :key="item.date"
              class="w-3 rounded-t-sm bg-primary/60"
              :class="{ 'bg-primary': item.duration === maxDailyDuration && item.duration > 0 }"
              :style="{ height: getTrendHeight(item.duration) }"
              :title="prettyMs(item.duration, { compact: true })"
            ></div>
          </div>
        </div>

        <div v-if="siteMovement.length === 0" class="py-6 text-center text-xs text-outline">
          Browse some sites to see comparisons here.
        </div>

        <div v-else class="border-y border-base-300">
          <div
            v-for="site in siteMovement"
            :key="site.hostname"
            class="grid grid-cols-[1fr_auto_58px] items-center gap-3 border-b border-base-300 px-1 py-2 last:border-b-0"
          >
            <span class="truncate text-[13px] leading-4">{{ site.hostname }}</span>
            <span class="font-mono text-[13px] leading-4 text-outline">
              {{ prettyMs(site.thisWeek, { compact: true }) }}
            </span>
            <span
              class="flex items-center justify-end gap-1 font-mono text-[12px] leading-4"
              :class="site.changePercent >= 0 ? 'text-primary' : 'text-tertiary'"
            >
              <InspectorIcon
                :name="site.changePercent >= 0 ? 'arrow-right' : 'minus'"
                size="size-3"
              />
              {{ getSiteChangeText(site) }}
            </span>
          </div>
        </div>
      </section>
    </main>

    <InspectorFooter text="Insights computed locally - No sync" icon="database" />
  </div>
</template>
