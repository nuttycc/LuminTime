<script setup lang="ts">
import { ref, computed } from 'vue';
import prettyMs from 'pretty-ms';
import type { ISiteStat, IPageStat } from '@/db/types';
import { getTodayTopSites, getSitePagesDetail } from '@/db/service';
import { useDexieLiveQuery } from '@/composables/useDexieLiveQuery';

// Selected site for detail view
const selectedDomain = ref<string | null>(null);

// Load top sites with live query
const topSites = useDexieLiveQuery(
  () => getTodayTopSites(10),
  []
);

// Load pages for selected site with live query
const pageDetails = useDexieLiveQuery(
  () =>
    selectedDomain.value
      ? getSitePagesDetail(selectedDomain.value)
      : Promise.resolve([]),
  [selectedDomain]
);

// Get currently selected site data
const selectedSite = computed(() => {
  if (!selectedDomain.value || !topSites.value) return null;
  return topSites.value.find((site) => site.domain === selectedDomain.value) || null;
});

// Go back to top sites view
const goBack = () => {
  selectedDomain.value = null;
};

// Calculate total time for today
const totalTime = computed(() => {
  if (!topSites.value) return 0;
  return topSites.value.reduce((sum, site) => sum + site.duration, 0);
});

// Calculate percentage for each site
const sitePercentage = (duration: number): number => {
  if (totalTime.value === 0) return 0;
  return Math.round((duration / totalTime.value) * 100);
};

// Calculate page percentage relative to selected site duration
const pagePercentage = (pageDuration: number): number => {
  const denom = selectedSite.value?.duration;
  if (typeof denom === 'number' && denom > 0) {
    return Math.min(100, (pageDuration / denom) * 100);
  }
  return 0;
};

// Skeleton loading rows
const skeletonRows = Array.from({ length: 5 }, (_, i) => i);
</script>

<template>
  <div class="flex flex-col h-full bg-white dark:bg-gray-900">
    <!-- Header -->
    <div class="sticky top-0 z-10 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shrink-0">
      <div class="px-4 py-3 sm:px-5">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-2 min-w-0 flex-1">
            <Transition
              name="fade"
              mode="out-in"
            >
              <button
                v-if="selectedDomain"
                key="back"
                class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                @click="goBack"
                aria-label="Go back"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            </Transition>
            <div class="min-w-0 flex-1">
              <h1 class="text-base font-semibold text-gray-900 dark:text-white truncate leading-tight">
                {{ selectedDomain || "Today's Activity" }}
              </h1>
              <p
                v-if="!selectedDomain"
                class="text-xs text-gray-500 dark:text-gray-400 mt-0.5"
              >
                {{ totalTime > 0 ? prettyMs(totalTime) : 'No activity yet' }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto">
      <!-- Top Sites View -->
      <div v-if="!selectedDomain" class="p-3 sm:p-4 space-y-2">
        <!-- Loading State -->
        <template v-if="!topSites">
          <div
            v-for="i in skeletonRows"
            :key="`skeleton-${i}`"
            class="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 space-y-2 animate-pulse"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <div class="h-5 w-5 rounded bg-gray-300 dark:bg-gray-600" />
                <div class="h-4 flex-1 max-w-32 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
              <div class="h-4 w-8 bg-gray-300 dark:bg-gray-600 rounded" />
            </div>
            <div class="h-2 w-full bg-gray-300 dark:bg-gray-600 rounded" />
            <div class="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded" />
          </div>
        </template>

        <!-- Empty State -->
        <template v-else-if="topSites.length === 0">
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <svg class="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No activity recorded
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              Start browsing to see statistics
            </p>
          </div>
        </template>

        <!-- Sites List -->
        <template v-else>
          <div
            v-for="(site, index) in topSites"
            :key="`${site.date}-${site.domain}`"
            class="group rounded-md bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-800 p-3 cursor-pointer transition-colors"
            @click="selectedDomain = site.domain"
          >
            <!-- Header: Rank and Domain -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="inline-flex items-center justify-center px-2 py-0.5 text-xs font-semibold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-100 rounded">
                  {{ index + 1 }}
                </span>
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ site.domain }}
                </p>
              </div>
              <svg class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>

            <!-- Duration and Percentage -->
            <div class="flex items-center justify-between mb-2 text-xs">
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ prettyMs(site.duration) }}
              </span>
              <span class="text-gray-500 dark:text-gray-400">
                {{ sitePercentage(site.duration) }}%
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="mb-2 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                class="h-full bg-blue-500 transition-all duration-300"
                :style="{ width: sitePercentage(site.duration) + '%' }"
              />
            </div>

          </div>
        </template>
      </div>

      <!-- Page Details View -->
      <div v-else class="p-3 sm:p-4 space-y-2">
        <!-- Loading State -->
        <template v-if="!pageDetails">
          <div
            v-for="i in skeletonRows"
            :key="`skeleton-detail-${i}`"
            class="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 space-y-2 animate-pulse"
          >
            <div class="flex items-start gap-2">
              <div class="h-5 w-5 rounded bg-gray-300 dark:bg-gray-600" />
              <div class="flex-1 space-y-1 min-w-0">
                <div class="h-3 w-full bg-gray-300 dark:bg-gray-600 rounded" />
                <div class="h-3 w-2/3 bg-gray-300 dark:bg-gray-600 rounded" />
              </div>
            </div>
            <div class="h-2 w-full bg-gray-300 dark:bg-gray-600 rounded" />
          </div>
        </template>

        <!-- Empty State -->
        <template v-else-if="pageDetails.length === 0">
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <svg class="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p class="text-sm font-medium text-gray-900 dark:text-white mb-1">
              No pages recorded
            </p>
            <p class="text-xs text-gray-500 dark:text-gray-400">
              No page activity found
            </p>
          </div>
        </template>

        <!-- Pages List -->
        <template v-else>
          <div
            v-for="(page, index) in pageDetails"
            :key="`${page.date}-${page.domain}-${page.path}`"
            class="rounded-md bg-gray-50 dark:bg-gray-800/50 p-3 space-y-2"
          >
            <!-- Page Index and Title -->
            <div class="flex items-start gap-2 min-w-0">
              <span class="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-100 rounded">
                {{ index + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {{ page.title || 'Untitled' }}
                </p>
                <p
                  class="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5"
                  :title="page.fullPath"
                >
                  {{ page.fullPath }}
                </p>
              </div>
            </div>

            <!-- Duration -->
            <div class="flex items-center text-xs">
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ prettyMs(page.duration) }}
              </span>
            </div>

            <!-- Progress Bar -->
            <div class="h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div 
                class="h-full bg-green-500 transition-all duration-300"
                :style="{ width: pagePercentage(page.duration) + '%' }"
              />
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
