<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { AnimatePresence, motion, stagger } from "motion-v";
import { onClickOutside } from "@vueuse/core";
import { useDateRange, type ViewMode } from "@/composables/useDateRange";
import { getAggregatedSites, getHourlyTrend, getRangeStats } from "@/db/service";
import type { ISiteStat } from "@/db/types";
import { useLiveQuery } from "@/composables/useDexieLiveQuery";
import DateNavigator from "@/components/DateNavigator.vue";
import TrendChart, { type ChartItem } from "@/components/TrendChart.vue";

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
  show: { opacity: 1, x: 0, transition: { duration: 0.16 } },
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

    const result = await getRangeStats(startDate.value, endDate.value, 20);
    return { sites: result.sites, trend: result.trend };
  },
  { sites: [], trend: [] },
  [view, startDate, endDate],
);

const sites = computed(() => homeData.value.sites);
const trendData = computed(() => homeData.value.trend);
const visibleSites = computed(() => sites.value.slice(0, 6));
const trackedSiteCount = computed(() => sites.value.length);

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
  const label =
    trendData.value.length > 10
      ? d.getDate().toString()
      : d.toLocaleDateString(undefined, { weekday: "narrow" });

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

const activeTimeLabel = computed(() =>
  totalDuration.value > 0 ? prettyMs(totalDuration.value, { secondsDecimalDigits: 0 }) : "0s",
);

const sitePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.max(4, Math.round((duration / totalDuration.value) * 100));
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
  <div class="flex min-h-0 flex-col bg-base-100 text-base-content">
    <header
      class="flex h-12 items-center justify-between border-b border-base-200 bg-base-100 px-3"
    >
      <div class="min-w-0">
        <div class="truncate text-base font-semibold leading-tight">LuminTime</div>
        <div class="text-[10px] leading-tight text-base-content/45">Browser activity</div>
      </div>

      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/10 px-2 py-1 text-[11px] font-semibold leading-none text-primary"
        >
          <span class="size-1.5 rounded-full bg-primary"></span>
          Local only
        </span>

        <div ref="menuRef" class="relative">
          <button
            class="btn btn-ghost btn-square btn-sm"
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
              :initial="{ opacity: 0, scale: 0.96, y: -4 }"
              :animate="{
                opacity: 1,
                scale: 1,
                y: 0,
                transition: { duration: 0.16, delayChildren: stagger(0.03) },
              }"
              :exit="{ opacity: 0, scale: 0.96, y: -4, transition: { duration: 0.12 } }"
              class="menu absolute right-0 top-full z-30 mt-1 w-36 origin-top-right rounded-box border border-base-300 bg-base-200 p-1.5 shadow-md"
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
    </header>

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

    <main class="flex-1 space-y-3 overflow-y-auto p-3">
      <section
        class="rounded-lg border border-base-300 bg-base-200/45 p-3"
        aria-label="Activity summary"
      >
        <div class="flex items-center justify-between gap-2">
          <div class="text-[11px] font-semibold text-base-content/55">Current period</div>
          <div class="text-[11px] text-base-content/45">Stored in browser</div>
        </div>

        <div class="mt-2 flex items-end justify-between gap-3">
          <div class="min-w-0">
            <div class="font-mono text-2xl font-black leading-none text-primary">
              {{ activeTimeLabel }}
            </div>
            <div class="mt-1 text-xs text-base-content/55">active time</div>
          </div>

          <div class="shrink-0 text-right text-xs leading-5 text-base-content/55">
            <div>{{ trackedSiteCount }} {{ trackedSiteCount === 1 ? "site" : "sites" }}</div>
            <div>No sync</div>
          </div>
        </div>
      </section>

      <section
        class="rounded-lg border border-base-200 bg-base-100 p-2"
        aria-label="Activity trend"
      >
        <div class="flex items-center justify-between px-1 pt-1">
          <div class="text-xs font-semibold text-base-content/55">Activity trend</div>
          <div class="text-[11px] text-base-content/40">{{ view }}</div>
        </div>
        <TrendChart :key="chartRenderKey" :items="chartItems" />
      </section>

      <section class="space-y-2" aria-label="Top sites">
        <div class="flex items-center justify-between px-1">
          <div class="text-xs font-semibold text-base-content/55">Top Sites</div>
          <button
            class="btn btn-ghost btn-xs h-6 min-h-6 px-1.5 text-[11px] text-base-content/55"
            @click="goToHistory"
          >
            History
          </button>
        </div>

        <div
          v-if="sites.length === 0"
          class="rounded-lg border border-dashed border-base-300 bg-base-200/25 px-3 py-4"
        >
          <div class="text-sm font-medium">No activity recorded yet</div>
          <div class="mt-1 text-xs leading-5 text-base-content/55">
            Browse normally. Local activity will appear here when LuminTime records it.
          </div>
        </div>

        <div v-else class="space-y-1">
          <button
            v-for="(site, index) in visibleSites"
            :key="site.hostname"
            class="group flex w-full items-center gap-2 rounded-lg border border-base-200 bg-base-200/25 px-2.5 py-2 text-left transition-colors hover:border-base-300 hover:bg-base-200/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :aria-label="getSiteLabel(site, index)"
            @click="goToDetail(site.hostname)"
          >
            <div
              class="flex size-7 shrink-0 items-center justify-center rounded-md bg-base-300/70 font-mono text-xs font-bold text-primary"
            >
              {{ index + 1 }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <span class="truncate text-sm font-medium">{{ site.hostname }}</span>
                <span class="shrink-0 font-mono text-xs font-semibold">
                  {{ prettyMs(site.duration, { secondsDecimalDigits: 0 }) }}
                </span>
              </div>

              <div class="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-base-300">
                <div
                  class="h-full rounded-full bg-primary"
                  :style="{ width: `${sitePercentage(site.duration)}%` }"
                ></div>
              </div>
            </div>

            <svg
              class="size-4 shrink-0 text-base-content/25 transition-colors group-hover:text-base-content/50"
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
          </button>
        </div>
      </section>

      <footer class="px-1 pb-1 text-[11px] text-base-content/40">
        Tracking locally &middot; No sync
      </footer>
    </main>
  </div>
</template>
