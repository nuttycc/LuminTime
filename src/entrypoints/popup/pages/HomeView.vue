<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { useDateRange, type ViewMode } from "@/composables/useDateRange";
import { getAggregatedSites, getHourlyTrend, getRangeStats } from "@/db/service";
import type { ISiteStat } from "@/db/types";
import { useLiveQuery } from "@/composables/useDexieLiveQuery";
import TrendChart, { type ChartItem } from "@/components/TrendChart.vue";

const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, goToday, isToday, canNext } =
  useDateRange();

const navigateTo = (path: string, query?: Record<string, string>) => {
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
const visibleSites = computed(() => sites.value.slice(0, 5));
const trackedSiteCount = computed(() => sites.value.length);

const viewOptions: { label: string; value: ViewMode }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];

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
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <header
      class="flex h-10 shrink-0 items-center justify-between border-b border-base-300 bg-base-100 px-3"
    >
      <div class="flex min-w-0 items-center gap-2">
        <div class="truncate text-lg font-semibold leading-6 text-primary">LuminTime</div>
      </div>

      <div class="flex items-center gap-1">
        <button
          class="flex size-7 items-center justify-center rounded border border-transparent text-base-content/70 transition-colors hover:border-base-300 hover:bg-base-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open insights"
          title="Insights"
          @click="navigateTo('/insights')"
        >
          <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 19V5m0 14h16M8 15v-4m4 4V8m4 7v-6"
            />
          </svg>
        </button>

        <button
          class="flex size-7 items-center justify-center rounded border border-transparent text-base-content/70 transition-colors hover:border-base-300 hover:bg-base-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open history"
          title="History"
          @click="goToHistory"
        >
          <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        <button
          class="flex size-7 items-center justify-center rounded border border-transparent text-base-content/70 transition-colors hover:border-base-300 hover:bg-base-200 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Open settings"
          title="Settings"
          @click="navigateTo('/settings')"
        >
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
        </button>
      </div>
    </header>

    <section class="shrink-0 border-b border-base-300 px-3 py-3">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-1">
          <button
            class="flex size-7 items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Previous period"
            @click="prev"
          >
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <button
            class="min-w-0 truncate rounded px-1.5 py-1 text-sm font-semibold leading-5 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="{ 'text-primary': !isToday }"
            :aria-label="isToday ? label : 'Go to today'"
            @click="!isToday && goToday()"
          >
            {{ label }}
          </button>
          <button
            class="flex size-7 items-center justify-center rounded text-base-content/70 transition-colors hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-30"
            aria-label="Next period"
            :disabled="canNext === false"
            @click="next"
          >
            <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </div>

        <div class="flex shrink-0 rounded border border-base-300 bg-surface-low p-0.5">
          <button
            v-for="option in viewOptions"
            :key="option.value"
            class="rounded px-2.5 py-1 text-xs leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="
              view === option.value
                ? 'bg-base-300 text-primary'
                : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
            "
            :aria-pressed="view === option.value"
            @click="updateView(option.value)"
          >
            {{ option.label }}
          </button>
        </div>
      </div>
    </section>

    <main class="custom-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 pb-4">
      <section
        class="rounded border border-base-300 bg-[#111827] p-3"
        aria-label="Activity summary"
      >
        <div class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
          Total Active Time
        </div>

        <div class="mt-2 font-mono text-lg font-semibold leading-6 text-primary">
          {{ activeTimeLabel }}
        </div>

        <div class="mt-3 flex items-center gap-3 border-t border-base-300/70 pt-2">
          <div class="flex items-center gap-1 text-xs leading-4 text-base-content/65">
            <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M12 3a9 9 0 100 18 9 9 0 000-18z"
              />
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M3.6 9h16.8M3.6 15h16.8M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9M12 3c-2 2.4-3 5.4-3 9s1 6.6 3 9"
              />
            </svg>
            <span>{{ trackedSiteCount }} {{ trackedSiteCount === 1 ? "site" : "sites" }}</span>
          </div>
          <div class="flex items-center gap-1 text-xs leading-4 text-base-content/65">
            <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 10V7a5 5 0 00-10 0v3M5 10h14v10H5z"
              />
            </svg>
            <span>stored in browser</span>
          </div>
        </div>
      </section>

      <section class="space-y-2" aria-label="Activity trend">
        <div class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
          Activity trend
        </div>
        <div class="rounded border border-base-300 bg-base-100 px-1 pb-5 pt-1">
          <TrendChart :key="chartRenderKey" :items="chartItems" />
        </div>
      </section>

      <section class="space-y-2" aria-label="Top sites">
        <div class="flex items-center justify-between">
          <div class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
            Top Sites
          </div>
          <button
            class="rounded border border-transparent px-1.5 py-1 text-[11px] leading-3 text-base-content/55 transition-colors hover:border-base-300 hover:bg-base-200 hover:text-base-content focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="goToHistory"
          >
            History
          </button>
        </div>

        <div
          v-if="sites.length === 0"
          class="rounded border border-dashed border-base-300 bg-base-200/30 px-3 py-4"
        >
          <div class="text-sm font-medium leading-5">No activity recorded yet</div>
          <div class="mt-1 text-xs leading-5 text-base-content/60">
            Browse normally. Local activity will appear here when LuminTime records it.
          </div>
        </div>

        <div v-else class="border-y border-base-300">
          <button
            v-for="(site, index) in visibleSites"
            :key="site.hostname"
            class="group flex w-full items-center gap-3 border-b border-base-300/70 px-1 py-2 text-left last:border-b-0 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :aria-label="getSiteLabel(site, index)"
            @click="goToDetail(site.hostname)"
          >
            <div class="w-5 shrink-0 text-right font-mono text-xs leading-4 text-outline">
              {{ index + 1 }}
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-baseline justify-between gap-2">
                <span class="truncate text-xs leading-4 text-base-content">{{
                  site.hostname
                }}</span>
                <span class="shrink-0 font-mono text-xs leading-4 text-primary">
                  {{ prettyMs(site.duration, { secondsDecimalDigits: 0 }) }}
                </span>
              </div>

              <div class="mt-1 h-1 w-full overflow-hidden rounded-sm bg-base-300">
                <div
                  class="h-full rounded-sm bg-primary"
                  :style="{ width: `${sitePercentage(site.duration)}%` }"
                ></div>
              </div>
            </div>

            <svg
              class="size-4 shrink-0 text-outline opacity-0 transition-opacity group-hover:opacity-100"
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
    </main>

    <footer
      class="flex h-8 shrink-0 items-center justify-center border-t border-base-300 bg-surface-lowest px-3 text-center font-mono text-xs text-outline"
    >
      <span>Tracking locally - No sync</span>
    </footer>
  </div>
</template>
