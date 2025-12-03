<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import prettyMs from 'pretty-ms';
import { useDateRange, type ViewMode } from '@/composables/useDateRange';
import { getAggregatedSites, getDailyTrend, getHourlyTrend } from '@/db/service';
import type { ISiteStat } from '@/db/types';
import { getTodayStr } from '@/db/utils';
import DateNavigator from '@/components/DateNavigator.vue';
import TrendChart, { type ChartItem } from '@/components/TrendChart.vue';
import ActiveSessionCard from '@/components/ActiveSessionCard.vue';
import { useActiveSession } from '@/composables/useActiveSession';

const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, canNext } = useDateRange();

const sites = ref<ISiteStat[]>([]);
type TrendData =
  | { hour: string; duration: number }
  | { date: string; duration: number };

const trendData = ref<TrendData[]>([]);
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  try {
    let trend: TrendData[] = [];
    let sitesData: ISiteStat[] = [];

    if (view.value === 'day') {
      [sitesData, trend] = await Promise.all([
        getAggregatedSites(startDate.value, endDate.value, 20),
        getHourlyTrend(startDate.value)
      ]);
    } else {
      [sitesData, trend] = await Promise.all([
        getAggregatedSites(startDate.value, endDate.value, 20),
        getDailyTrend(startDate.value, endDate.value)
      ]);
    }

    sites.value = sitesData;
    trendData.value = trend;
  } catch (e) {
    console.error('Failed to fetch data', e);
  } finally {
    loading.value = false;
  }
};

// Re-fetch when date range changes
watch([startDate, endDate], fetchData);

onMounted(fetchData);

const mapHourlyToChartItem = (item: { hour: string; duration: number }): ChartItem => {
  const h = parseInt(item.hour, 10);
  const showLabel = h % 4 === 0;
  return {
    key: `h-${item.hour}`,
    value: item.duration,
    label: showLabel ? `${h}:00` : '',
    tooltip: `${h}:00, ${prettyMs(item.duration, { compact: true })}`,
    active: false
  };
};

const mapDailyToChartItem = (item: { date: string; duration: number }): ChartItem => {
  const d = new Date(item.date + 'T00:00:00');
  let label = '';
  if (trendData.value.length > 10) {
     label = d.getDate().toString();
  } else {
     label = d.toLocaleDateString(undefined, { weekday: 'narrow' });
  }

  return {
    key: item.date,
    value: item.duration,
    label,
    tooltip: `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}: ${prettyMs(item.duration, { compact: true })}`,
    active: item.date === date.value
  };
};

const chartItems = computed<ChartItem[]>(() => {
  return trendData.value.map(item =>
    'hour' in item ? mapHourlyToChartItem(item) : mapDailyToChartItem(item)
  );
});

const totalDuration = computed(() => {
  return sites.value.reduce((sum, site) => sum + site.duration, 0);
});

const sitePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.round((duration / totalDuration.value) * 100);
};

const goToDetail = (hostname: string) => {
  router.push({
    path: `/site/${hostname}`,
    query: { view: view.value, date: date.value }
  });
};

const goToHistory = () => {
  router.push({
    path: '/history',
    query: { view: view.value, date: date.value }
  });
};

const updateView = (v: ViewMode) => {
  view.value = v;
};

const { session: activeSession, activeDuration, isActive } = useActiveSession();

const showActiveCard = computed(() => {
  if (!isActive.value || !activeSession.value) return false;
  const today = getTodayStr();
  return today >= startDate.value && today <= endDate.value;
});
</script>

<template>
  <div class="flex flex-col h-full bg-base-100">
    <!-- App Title -->
    <div class="navbar bg-base-100 min-h-12 border-b border-base-200 justify-center">
       <div class="font-bold text-lg">LuminTime</div>
    </div>

    <!-- Header with Date Navigator -->
    <DateNavigator
      :view="view"
      :label="label"
      :can-next="canNext"
      @update:view="updateView"
      @prev="prev"
      @next="next"
    />

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4">

      <!-- Summary Card -->
      <div class="card bg-base-200 shadow-sm border border-base-300">
        <div class="card-body p-4 items-center text-center">
          <div class="text-base-content/60 text-xs font-bold uppercase tracking-widest">Total Active Time</div>
          <div class="text-3xl font-black text-primary font-mono">
            {{ totalDuration > 0 ? prettyMs(totalDuration, {secondsDecimalDigits: 0}) : '0s' }}
          </div>
        </div>
      </div>

      <!-- Trend Chart -->
      <div class="card bg-base-100 shadow-sm border border-base-200">
        <div class="card-body p-2">
           <TrendChart :items="chartItems" />
        </div>
      </div>

      <!-- Active Session -->
      <ActiveSessionCard
        v-if="showActiveCard && activeSession"
        :session="activeSession"
        :duration="activeDuration"
        mode="aggregate"
        :date-range="{ startDate, endDate }"
      />

      <!-- Sites List -->
      <div class="flex flex-col gap-2">
        <div class="text-xs font-bold text-base-content/40 uppercase px-2">Top Sites</div>

        <div v-if="loading" class="flex flex-col gap-2">
          <div v-for="i in 5" :key="i" class="skeleton h-12 w-full rounded-box opacity-50"></div>
        </div>

        <div v-else-if="sites.length === 0" class="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
          <svg class="size-12 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <div class="text-sm font-medium">No activity recorded</div>
          <div class="text-xs">Browse some sites to see data here.</div>
        </div>

        <div v-else class="flex flex-col gap-1">
          <button
            v-for="site in sites"
            :key="site.hostname"
            class="flex items-center gap-3 p-3 hover:bg-base-200/50 rounded-box transition-colors text-left"
            @click="goToDetail(site.hostname)"
          >
            <!-- Icon placeholder or favicon if available -->
            <div class="size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0 relative overflow-hidden">
               <span>{{ site.hostname.charAt(0).toUpperCase() }}</span>
            </div>

            <div class="flex flex-col flex-1 min-w-0 gap-1">
              <div class="flex justify-between items-baseline">
                <span class="font-medium truncate text-sm">{{ site.hostname }}</span>
                <span class="font-mono text-xs font-bold">{{ prettyMs(site.duration, { secondsDecimalDigits: 0 }) }}</span>
              </div>

              <!-- Progress bar -->
              <div class="w-full bg-base-300 rounded-full h-1.5 overflow-hidden">
                <div
                  class="bg-primary h-full rounded-full"
                  :style="{ width: `${sitePercentage(site.duration)}%` }"
                ></div>
              </div>
            </div>

            <svg class="size-4 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
          </button>

          <!-- View All History -->
          <div class="flex justify-center pt-2 pb-4">
             <button class="btn btn-xs btn-ghost text-xs uppercase opacity-50 hover:opacity-100" @click="goToHistory">
                View All History
             </button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>
