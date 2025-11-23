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
              <UButton
                v-if="selectedDomain"
                key="back"
                icon="i-tabler-arrow-left"
                color="gray"
                variant="ghost"
                size="sm"
                square
                @click="goBack"
              />
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
            class="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 space-y-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 flex-1 min-w-0">
                <USkeleton class="h-5 w-5 rounded" />
                <USkeleton class="h-4 flex-1 max-w-32" />
              </div>
              <USkeleton class="h-4 w-8" />
            </div>
            <USkeleton class="h-2 w-full" />
            <USkeleton class="h-3 w-12" />
          </div>
        </template>

        <!-- Empty State -->
        <template v-else-if="topSites.length === 0">
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <UIcon
              name="i-tabler-browser-off"
              class="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3"
            />
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
                <UBadge
                  :label="String(index + 1)"
                  color="primary"
                  variant="subtle"
                  size="xs"
                />
                <p class="text-sm font-semibold text-gray-900 dark:text-white truncate">
                  {{ site.domain }}
                </p>
              </div>
              <UIcon
                name="i-tabler-chevron-right"
                class="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors shrink-0 ml-2"
              />
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
            <UProgress
              :model-value="sitePercentage(site.duration)"
              :max="100"
              color="primary"
              size="xs"
              class="mb-2"
            />

            <!-- Visit Count -->
            <div class="text-xs text-gray-500 dark:text-gray-400">
              {{ site.visitCount }} visit{{ site.visitCount !== 1 ? 's' : '' }}
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
            class="p-3 rounded-md bg-gray-50 dark:bg-gray-800/50 space-y-2"
          >
            <div class="flex items-start gap-2">
              <USkeleton class="h-5 w-5 rounded" />
              <div class="flex-1 space-y-1 min-w-0">
                <USkeleton class="h-3 w-full" />
                <USkeleton class="h-3 w-2/3" />
              </div>
            </div>
            <USkeleton class="h-2 w-full" />
          </div>
        </template>

        <!-- Empty State -->
        <template v-else-if="pageDetails.length === 0">
          <div class="flex flex-col items-center justify-center py-16 text-center">
            <UIcon
              name="i-tabler-file-off"
              class="w-10 h-10 text-gray-400 dark:text-gray-600 mb-3"
            />
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
              <UBadge
                :label="String(index + 1)"
                color="secondary"
                variant="subtle"
                size="xs"
                square
              />
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

            <!-- Duration and Visit Count -->
            <div class="flex items-center justify-between text-xs">
              <span class="font-medium text-gray-700 dark:text-gray-300">
                {{ prettyMs(page.duration) }}
              </span>
              <span class="text-gray-500 dark:text-gray-400">
                {{ page.visitCount }}{{ page.visitCount > 1 ? 'x' : ' visit' }}
              </span>
            </div>

            <!-- Progress Bar -->
            <UProgress
              :model-value="Math.min(100, (page.duration / (selectedSite?.duration || 1)) * 100)"
              :max="100"
              color="success"
              size="xs"
            />
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
