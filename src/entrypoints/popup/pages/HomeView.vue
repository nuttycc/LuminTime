<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { motion, AnimatePresence, stagger } from "motion-v";
import { onClickOutside } from "@vueuse/core";
import { useDateRange, type ViewMode } from "@/composables/useDateRange";
import { getAggregatedSites, getHourlyTrend, getRangeStats } from "@/db/service";
import type { ISiteStat } from "@/db/types";
import { useLiveQuery } from "@/composables/useDexieLiveQuery";
import DateNavigator from "@/components/DateNavigator.vue";
import TrendChart, { type ChartItem } from "@/components/TrendChart.vue";

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
  exit: { opacity: 0, x: 12, transition: { duration: 0.15 } },
};

const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, goToday, isToday, canNext } =
  useDateRange();

const menuOpen = ref(false);
const menuRef = ref<HTMLElement | null>(null);
onClickOutside(menuRef, () => {
  menuOpen.value = false;
});

const menuItemVariants = {
  hidden: { opacity: 0, x: 8 },
  show: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  exit: { opacity: 0, x: 8, transition: { duration: 0.1 } },
};

const navigateTo = (path: string, query?: Record<string, string>) => {
  menuOpen.value = false;
  router.push(query ? { path, query } : path);
};

type TrendData = { hour: string; duration: number } | { date: string; duration: number };

interface HomeData {
  sites: ISiteStat[];
  trend: TrendData[];
}

const homeData = useLiveQuery<HomeData>(
  async () => {
    if (view.value === "day") {
      const [sitesData, trend] = await Promise.all([
        getAggregatedSites(startDate.value, endDate.value, 20),
        getHourlyTrend(startDate.value),
      ]);
      return { sites: sitesData, trend };
    }
    // Optimization: Fetch sites and trend in one DB pass for range views
    const result = await getRangeStats(startDate.value, endDate.value, 20);
    return { sites: result.sites, trend: result.trend };
  },
  { sites: [], trend: [] },
  [view, startDate, endDate],
);

const sites = computed(() => homeData.value.sites);
const trendData = computed(() => homeData.value.trend);

const mapHourlyToChartItem = (item: { hour: string; duration: number }): ChartItem => {
  const h = parseInt(item.hour, 10);
  const showLabel = h % 4 === 0;
  return {
    key: `h-${item.hour}`,
    value: item.duration,
    label: showLabel ? `${h}:00` : "",
    tooltip: `${h}:00, ${prettyMs(item.duration, { compact: true })}`,
    ariaLabel: `${h}:00, ${prettyMs(item.duration, { verbose: true })}`,
    active: false,
  };
};

const mapDailyToChartItem = (item: { date: string; duration: number }): ChartItem => {
  const d = new Date(item.date + "T00:00:00");
  let label = "";
  if (trendData.value.length > 10) {
    label = d.getDate().toString();
  } else {
    label = d.toLocaleDateString(undefined, { weekday: "narrow" });
  }

  return {
    key: item.date,
    value: item.duration,
    label,
    tooltip: `${d.toLocaleDateString(undefined, { month: "short", day: "numeric" })}: ${prettyMs(item.duration, { compact: true })}`,
    ariaLabel: `${d.toLocaleDateString(undefined, { month: "long", day: "numeric" })}: ${prettyMs(item.duration, { verbose: true })}`,
    active: item.date === date.value,
  };
};

const chartItems = computed<ChartItem[]>(() => {
  return trendData.value.map((item) =>
    "hour" in item ? mapHourlyToChartItem(item) : mapDailyToChartItem(item),
  );
});

const chartRenderKey = computed(() => `${view.value}-${startDate.value}-${endDate.value}`);

const totalDuration = computed(() => {
  return sites.value.reduce((sum, site) => sum + site.duration, 0);
});

const sitePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.round((duration / totalDuration.value) * 100);
};

const getSiteLabel = (site: ISiteStat, index: number): string => {
  const duration = prettyMs(site.duration, { secondsDecimalDigits: 0, verbose: true });
  return `Rank ${index + 1}, ${site.hostname}, time spent ${duration}`;
};

const goToDetail = (hostname: string) => {
  router.push({
    path: `/site/${hostname}`,
    query: { view: view.value, date: date.value },
  });
};

const goToHistory = () => {
  navigateTo("/history", { view: view.value, date: date.value });
};

const updateView = (v: ViewMode) => {
  view.value = v;
};
</script>

<template>
  <div class="flex flex-col min-h-0 bg-base-100">
    <!-- App Title -->
    <div class="flex items-center justify-between bg-base-100 h-12 border-b border-base-200 px-4">
      <div class="font-bold text-lg">LuminTime</div>
      <div ref="menuRef" class="relative">
        <button
          class="btn btn-ghost btn-circle btn-sm"
          aria-label="Menu"
          @click="menuOpen = !menuOpen"
        >
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 5v.01M12 12v.01M12 19v.01"
            />
          </svg>
        </button>
        <AnimatePresence>
          <motion.ul
            v-if="menuOpen"
            key="menu"
            :initial="{ opacity: 0, scale: 0.9, y: -4 }"
            :animate="{
              opacity: 1,
              scale: 1,
              y: 0,
              transition: { duration: 0.2, delayChildren: stagger(0.05) },
            }"
            :exit="{ opacity: 0, scale: 0.9, y: -4, transition: { duration: 0.15 } }"
            class="absolute right-0 top-full mt-1 menu bg-base-200 rounded-box z-30 w-36 p-1.5 shadow-lg border border-base-300 origin-top-right"
          >
            <motion.li :variants="menuItemVariants">
              <button @click="navigateTo('/insights')">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Insights
              </button>
            </motion.li>
            <motion.li :variants="menuItemVariants">
              <button @click="goToHistory">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                History
              </button>
            </motion.li>
            <motion.li :variants="menuItemVariants">
              <button @click="navigateTo('/settings')">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Settings
              </button>
            </motion.li>
          </motion.ul>
        </AnimatePresence>
      </div>
    </div>

    <!-- Header with Date Navigator -->
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

    <!-- Main Content -->
    <motion.div
      class="flex-1 p-4 space-y-4"
      :variants="contentVariants"
      initial="hidden"
      animate="show"
    >
      <!-- Summary Card -->
      <motion.div :variants="cardVariant" class="card bg-base-200 shadow-sm border border-base-300">
        <div class="card-body p-4 items-center text-center">
          <div class="text-base-content/60 text-xs font-bold uppercase tracking-widest">
            Total Active Time
          </div>
          <div class="text-3xl font-black text-primary font-mono">
            {{ totalDuration > 0 ? prettyMs(totalDuration, { secondsDecimalDigits: 0 }) : "0s" }}
          </div>
        </div>
      </motion.div>

      <!-- Trend Chart -->
      <motion.div :variants="cardVariant" class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-2">
          <TrendChart :key="chartRenderKey" :items="chartItems" />
        </div>
      </motion.div>

      <!-- Sites List -->
      <motion.div :variants="cardVariant" class="flex flex-col gap-2">
        <div class="text-xs font-bold text-base-content/40 uppercase px-2">Top Sites</div>

        <AnimatePresence mode="wait">
          <motion.div
            v-if="sites.length === 0"
            key="empty"
            :initial="{ opacity: 0 }"
            :animate="{ opacity: 0.6 }"
            :exit="{ opacity: 0 }"
            class="flex flex-col items-center justify-center py-4 gap-2"
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
            <div class="text-sm font-medium">No activity recorded</div>
            <div class="text-xs">Browse some sites to see data here.</div>
          </motion.div>

          <motion.div
            v-else
            key="list"
            class="flex flex-col gap-1"
            :variants="listContainerVariants"
            initial="hidden"
            animate="show"
          >
            <motion.button
              v-for="(site, index) in sites"
              :key="site.hostname"
              layout
              :variants="listItemVariants"
              class="flex items-center gap-3 p-3 hover:bg-base-200/50 rounded-box transition-colors text-left"
              :aria-label="getSiteLabel(site, index)"
              @click="goToDetail(site.hostname)"
            >
              <!-- Rank number -->
              <div
                class="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0"
              >
                {{ index + 1 }}
              </div>

              <div class="flex flex-col flex-1 min-w-0 gap-1">
                <div class="flex justify-between items-baseline gap-2">
                  <span class="font-medium truncate text-sm">{{ site.hostname }}</span>
                  <span class="font-mono text-xs font-bold shrink-0">{{
                    prettyMs(site.duration, { secondsDecimalDigits: 0 })
                  }}</span>
                </div>

                <!-- Progress bar -->
                <div class="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                  <div
                    class="bg-primary h-full rounded-full"
                    :style="{ width: `${sitePercentage(site.duration)}%` }"
                  ></div>
                </div>
              </div>

              <svg
                class="size-4 text-base-content/30"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </motion.button>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  </div>
</template>
