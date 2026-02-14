<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import prettyMs from 'pretty-ms';
import { motion, AnimatePresence, stagger } from 'motion-v';
import { useLiveQuery } from '@/composables/useDexieLiveQuery';
import { getWeeklyInsights, type WeeklyInsights, type SiteComparison } from '@/db/insights';
import { formatDate, getStartOfWeek, getEndOfWeek, parseDate } from '@/utils/dateUtils';
import TrendChart, { type ChartItem } from '@/components/TrendChart.vue';

const contentVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren: stagger(0.08) },
  },
};

const cardVariant = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

const listContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { delayChildren: stagger(0.08) },
  },
};

const listItemVariants = {
  hidden: { opacity: 0, x: -12 },
  show: { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

const router = useRouter();

const today = new Date();
const weekStart = getStartOfWeek(today);
const weekEnd = getEndOfWeek(today);
const startStr = formatDate(weekStart);
const endStr = formatDate(weekEnd);

const defaultInsights: WeeklyInsights = {
  thisWeekTotal: 0,
  lastWeekTotal: 0,
  changePercent: 0,
  dailyTrend: [],
  heatmap: Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0)),
  topSitesComparison: [],
};

const insights = useLiveQuery<WeeklyInsights>(
  () => getWeeklyInsights(startStr, endStr),
  defaultInsights,
  [],
);

// Daily trend chart items
const chartItems = computed<ChartItem[]>(() => {
  return insights.value.dailyTrend.map((item) => {
    const d = parseDate(item.date);
    const label = d.toLocaleDateString(undefined, { weekday: 'narrow' });
    return {
      key: item.date,
      value: item.duration,
      label,
      tooltip: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${prettyMs(item.duration, { compact: true })}`,
      ariaLabel: `${d.toLocaleDateString(undefined, { weekday: 'long' })}: ${prettyMs(item.duration, { verbose: true })}`,
    };
  });
});

// Heatmap
const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hourLabels = [0, 4, 8, 12, 16, 20];

const heatmapMax = computed(() => {
  let max = 0;
  for (const row of insights.value.heatmap) {
    for (const val of row) {
      if (val > max) max = val;
    }
  }
  return max;
});

const getCellOpacity = (value: number): number => {
  if (value === 0 || heatmapMax.value === 0) return 0.05;
  return Math.max(0.1, value / heatmapMax.value);
};

const getCellTooltip = (dayIdx: number, hour: number): string => {
  const value = insights.value.heatmap[dayIdx][hour];
  return `${dayLabels[dayIdx]} ${hour}:00 – ${prettyMs(value, { compact: true })}`;
};

// Site comparison helpers
const getSiteChangeText = (site: SiteComparison): string => {
  if (site.lastWeek === 0) return 'New';
  const pct = Math.abs(Math.round(site.changePercent));
  return site.changePercent >= 0 ? `↑${pct}%` : `↓${pct}%`;
};

const getSiteChangeBadgeClass = (site: SiteComparison): string => {
  if (site.lastWeek === 0) return 'badge-info';
  return site.changePercent >= 0 ? 'badge-error' : 'badge-success';
};

const goBack = () => {
  router.back();
};

// Week label for header
const weekLabel = computed(() => {
  const start = parseDate(startStr);
  const end = parseDate(endStr);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
});
</script>

<template>
  <div class="flex flex-col min-h-0 bg-base-100">
    <!-- Navbar -->
    <div class="navbar bg-base-100 min-h-12 border-b border-base-200 px-2">
      <div class="navbar-start w-1/4">
        <button class="btn btn-ghost btn-circle btn-sm" aria-label="Back" @click="goBack">
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>
      <div class="navbar-center w-2/4 justify-center">
        <div class="flex flex-col items-center">
          <div class="font-bold text-lg">Insights</div>
          <div class="text-xs text-base-content/50">{{ weekLabel }}</div>
        </div>
      </div>
      <div class="navbar-end w-1/4"></div>
    </div>

    <!-- Main Content -->
    <motion.div
      class="flex-1 p-4 space-y-4 overflow-y-auto"
      :variants="contentVariants"
      initial="hidden"
      animate="show"
    >

      <!-- Overview Card -->
      <motion.div :variants="cardVariant" class="card bg-base-200 shadow-sm border border-base-300">
        <div class="card-body p-4 items-center text-center">
          <div class="text-base-content/60 text-xs font-bold uppercase tracking-widest">This Week</div>
          <div class="text-3xl font-black text-primary font-mono">
            {{ insights.thisWeekTotal > 0 ? prettyMs(insights.thisWeekTotal, { secondsDecimalDigits: 0 }) : '0s' }}
          </div>
          <div v-if="insights.lastWeekTotal > 0" class="text-sm mt-1">
            <span class="text-base-content/50">vs last week: </span>
            <span :class="insights.changePercent >= 0 ? 'text-error' : 'text-success'" class="font-semibold">
              {{ insights.changePercent >= 0 ? '↑' : '↓' }}{{ Math.abs(Math.round(insights.changePercent)) }}%
            </span>
          </div>
          <div v-else class="text-xs text-base-content/40 mt-1">No previous week data</div>
        </div>
      </motion.div>

      <!-- Daily Trend -->
      <motion.div :variants="cardVariant" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-2">
          <div class="text-xs font-bold text-base-content/40 uppercase px-2 pt-1">Daily Trend</div>
          <TrendChart :items="chartItems" />
        </div>
      </motion.div>

      <!-- Heatmap -->
      <motion.div :variants="cardVariant" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-3">
          <div class="text-xs font-bold text-base-content/40 uppercase mb-2">Active Hours</div>

          <!-- Hour labels -->
          <div class="grid gap-px ml-8" style="grid-template-columns: repeat(24, minmax(0, 1fr));">
            <div
              v-for="h in 24"
              :key="'hl-' + h"
              class="text-center text-[8px] text-base-content/40 select-none"
            >
              {{ hourLabels.includes(h - 1) ? (h - 1) : '' }}
            </div>
          </div>

          <!-- Heatmap grid -->
          <div v-for="(row, dayIdx) in insights.heatmap" :key="'day-' + dayIdx" class="flex items-center gap-1">
            <!-- Day label -->
            <div class="w-7 text-[10px] text-base-content/50 text-right shrink-0 select-none">
              {{ dayLabels[dayIdx] }}
            </div>

            <!-- Cells -->
            <div class="grid gap-px flex-1" style="grid-template-columns: repeat(24, minmax(0, 1fr));">
              <div
                v-for="(val, hour) in row"
                :key="'c-' + dayIdx + '-' + hour"
                class="aspect-square rounded-sm bg-primary group relative cursor-default"
                :style="{ opacity: getCellOpacity(val) }"
              >
                <!-- Tooltip -->
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-max">
                  <div class="bg-neutral text-neutral-content text-[10px] rounded py-0.5 px-1.5 shadow text-center whitespace-nowrap">
                    {{ getCellTooltip(dayIdx, hour) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <!-- Site Changes -->
      <motion.div :variants="cardVariant" class="flex flex-col gap-2">
        <div class="text-xs font-bold text-base-content/40 uppercase px-2">Top Sites vs Last Week</div>

        <AnimatePresence mode="wait">
          <motion.div
            v-if="insights.topSitesComparison.length === 0"
            key="empty"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 0.6 }"
            :exit="{ opacity: 0 }"
            class="flex flex-col items-center justify-center py-4 gap-2"
          >
            <svg class="size-12 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            <div class="text-sm font-medium">No site data this week</div>
            <div class="text-xs">Browse some sites to see comparisons here.</div>
          </motion.div>

          <motion.div
            v-else
            key="list"
            class="flex flex-col gap-1"
            :variants="listContainerVariants"
            initial="hidden"
            animate="show"
          >
            <motion.div
              v-for="site in insights.topSitesComparison"
              :key="site.hostname"
              :variants="listItemVariants"
              class="flex items-center gap-3 p-3 rounded-box bg-base-200/30"
            >
              <div class="flex flex-col flex-1 min-w-0 gap-0.5">
                <div class="flex justify-between items-center gap-2">
                  <span class="font-medium truncate text-sm">{{ site.hostname }}</span>
                  <span class="badge badge-sm" :class="getSiteChangeBadgeClass(site)">
                    {{ getSiteChangeText(site) }}
                  </span>
                </div>
                <div class="flex justify-between text-xs text-base-content/50">
                  <span>This week: {{ prettyMs(site.thisWeek, { compact: true }) }}</span>
                  <span v-if="site.lastWeek > 0">Last week: {{ prettyMs(site.lastWeek, { compact: true }) }}</span>
                  <span v-else class="italic">New this week</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

    </motion.div>
  </div>
</template>
