<script setup lang="ts">
import { computed, watch, ref } from 'vue';
import prettyMs from 'pretty-ms';
import type { ActiveSessionData } from '@/utils/SessionManager';
import { getSiteStat } from '@/db/service';
import { normalizeUrl } from '@/db/utils';

const props = defineProps<{
  session: ActiveSessionData;
  duration: number; // Current session duration (live)
  mode: 'aggregate' | 'log';
  dateRange?: { startDate: string; endDate: string };
}>();

const historicalDuration = ref(0);
const isLoadingHistory = ref(false);

const urlDetails = computed(() => {
  return normalizeUrl(props.session.url || '');
});

const hostname = computed(() => urlDetails.value.hostname);

const fetchHistory = async () => {
  if (props.mode !== 'aggregate' || !props.dateRange) {
    historicalDuration.value = 0;
    return;
  }

  isLoadingHistory.value = true;
  try {
    const stat = await getSiteStat(hostname.value, props.dateRange.startDate, props.dateRange.endDate);
    historicalDuration.value = stat ? stat.duration : 0;
  } catch (e) {
    console.error(e);
  } finally {
    isLoadingHistory.value = false;
  }
};

watch(() => [props.session.url, props.dateRange?.startDate, props.dateRange?.endDate], fetchHistory, { immediate: true });

const totalDuration = computed(() => {
  // If aggregate, sum historical + current
  // If log, just current (historical is 0)
  return historicalDuration.value + props.duration;
});

const displayDuration = computed(() => {
  // prettyMs might return stuff like "1m 30s", we want compact or similar style to existing
  return prettyMs(totalDuration.value, { compact: true });
});

const subtitle = computed(() => {
  if (props.mode === 'aggregate') return hostname.value;
  // For log mode, show path if available, else hostname
  return props.session.url;
});
</script>

<template>
  <div class="card bg-base-100 border border-primary/20 shadow-sm mb-2 relative overflow-hidden group">
    <!-- Active Indicator Strip -->
    <div class="absolute left-0 top-0 bottom-0 w-1 bg-primary"></div>

    <!-- Background pulsing effect -->
    <div class="absolute inset-0 bg-primary/5 pointer-events-none"></div>

    <div class="card-body p-3 flex-row items-center gap-3">
       <!-- Icon -->
       <div class="size-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold shrink-0 relative">
          <!-- Pulse animation dot -->
          <div class="absolute -top-1 -right-1 size-2.5 bg-green-500 rounded-full border-2 border-base-100 animate-pulse"></div>
          <span>{{ hostname.charAt(0).toUpperCase() }}</span>
       </div>

       <div class="flex flex-col flex-1 min-w-0 gap-0.5">
          <div class="flex justify-between items-center">
             <div class="flex items-center gap-2 min-w-0">
                <span class="text-[10px] font-bold text-primary uppercase tracking-wider opacity-80">Active Now</span>
             </div>
             <span class="font-mono text-xs font-black text-primary transition-all duration-500">
               {{ displayDuration }}
             </span>
          </div>

          <div class="flex justify-between items-baseline gap-2">
            <div class="flex flex-col min-w-0 w-full">
                <span class="font-medium truncate text-sm leading-tight" :title="session.title">{{ session.title || hostname }}</span>
                <span class="text-[10px] text-base-content/60 truncate font-mono block w-full" :title="session.url">
                  {{ subtitle }}
                </span>
            </div>
          </div>
       </div>
    </div>
  </div>
</template>
