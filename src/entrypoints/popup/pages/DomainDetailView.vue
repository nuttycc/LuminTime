<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import prettyMs from 'pretty-ms';
import { useDateRange, type ViewMode } from '@/composables/useDateRange';
import { getAggregatedPages } from '@/db/service';
import type { IPageStat } from '@/db/types';
import DateNavigator from '@/components/DateNavigator.vue';

const route = useRoute();
const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, canNext } = useDateRange();

const domain = computed(() => route.params.domain as string);
const pages = ref<IPageStat[]>([]);
const loading = ref(false);

const currentUrl = ref('');

const fetchData = async () => {
  if (!domain.value) return;

  loading.value = true;
  try {
    pages.value = await getAggregatedPages(domain.value, startDate.value, endDate.value);
  } catch (e) {
    console.error('Failed to fetch page details', e);
  } finally {
    loading.value = false;
  }
};

watch([startDate, endDate, domain], fetchData);

onMounted(async () => {
  fetchData();
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      currentUrl.value = tabs[0].url;
    }
  } catch (e) {
    console.error('Failed to get current tab', e);
  }
});

const isActivePage = (page: IPageStat) => {
  return page.fullPath === currentUrl.value;
};

const totalDuration = computed(() => {
  return pages.value.reduce((sum, p) => sum + p.duration, 0);
});

const pagePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.round((duration / totalDuration.value) * 100);
};

const goBack = () => {
  // Preserve query parameters
  router.push({
    path: '/',
    query: route.query
  });
};

const updateView = (v: ViewMode) => {
  view.value = v;
};

const goToDomainHistory = () => {
  router.push({
    path: '/history',
    query: { view: view.value, date: date.value, domain: domain.value }
  });
};

const goToPageHistory = (p: string) => {
  router.push({
    path: '/history',
    query: { view: view.value, date: date.value, domain: domain.value, path: p }
  });
};
</script>

<template>
  <div class="flex flex-col h-full bg-base-100">
    <!-- Custom Header -->
    <div class="navbar bg-base-100 sticky top-0 z-30 border-b border-base-200 min-h-12 px-2">
      <div class="navbar-start w-1/4">
        <div class="tooltip tooltip-right" data-tip="Back to Dashboard">
          <button class="btn btn-ghost btn-circle btn-sm" @click="goBack">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
      <div class="navbar-center w-2/4 justify-center flex-col gap-0.5">
        <h1 class="text-sm font-bold truncate max-w-[150px]">
          {{ domain }}
        </h1>
        <div class="text-[10px] text-base-content/60 font-mono">
           {{ prettyMs(totalDuration, { compact: true }) }}
        </div>
      </div>
      <div class="navbar-end w-1/4">
        <div class="tooltip tooltip-left" data-tip="Domain History">
          <button class="btn btn-ghost btn-circle btn-sm" @click="goToDomainHistory">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Date Navigator (Reused) -->
    <DateNavigator
      :view="view"
      :label="label"
      :can-next="canNext"
      @update:view="updateView"
      @prev="prev"
      @next="next"
    />

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto p-4">

      <div v-if="loading" class="flex flex-col gap-2">
         <div v-for="i in 5" :key="i" class="skeleton h-10 w-full rounded opacity-50"></div>
      </div>

      <div v-else-if="pages.length === 0" class="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
        <svg class="size-12 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <div class="text-sm font-medium">No pages visited</div>
        <div class="text-xs">No specific pages recorded for this domain in the selected period.</div>
      </div>

      <ul v-else class="flex flex-col gap-2">
         <li
            v-for="page in pages"
            :key="page.path"
            class="flex flex-col gap-1 p-3 hover:bg-base-200/50 rounded-box transition-colors border border-base-100 hover:border-base-200 cursor-pointer"
            :class="{ 'bg-primary/10 border-primary/20': isActivePage(page) }"
            @click="goToPageHistory(page.path)"
          >
            <div class="flex justify-between gap-2">
              <div class="flex flex-col min-w-0 flex-1">
                 <div class="font-medium text-sm truncate" :title="page.title || 'Untitled'">
                   {{ page.title || 'Untitled' }}
                 </div>
                 <div class="text-xs text-base-content/50 truncate font-mono" :title="page.fullPath">
                   {{ page.path }}
                 </div>
              </div>
              <div class="font-mono text-xs font-bold self-start mt-0.5">
                 {{ prettyMs(page.duration, { compact: true }) }}
              </div>
            </div>

            <!-- Mini Progress -->
             <div class="w-full bg-base-200 rounded-full h-1 mt-1 overflow-hidden">
                <div
                  class="bg-secondary h-full rounded-full"
                  :style="{ width: `${pagePercentage(page.duration)}%` }"
                ></div>
              </div>
          </li>
      </ul>

    </div>
  </div>
</template>
