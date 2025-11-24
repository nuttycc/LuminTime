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
  <div class="flex flex-col h-full bg-base-100">
    <!-- Header -->
    <div class="navbar bg-base-100 sticky top-0 z-10 border-b border-base-200 min-h-12 px-2">
      <div class="navbar-start w-1/4">
        <Transition name="fade" mode="out-in">
          <button
            v-if="selectedDomain"
            key="back"
            class="btn btn-ghost btn-circle btn-sm"
            @click="goBack"
            aria-label="Go back"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </Transition>
      </div>
      <div class="navbar-center w-2/4 justify-center">
        <h1 class="text-base font-bold truncate">
          {{ selectedDomain || "LuminTime" }}
        </h1>
      </div>
      <div class="navbar-end w-1/4"></div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 overflow-y-auto p-4">

      <!-- Top Sites View -->
      <template v-if="!selectedDomain">
        <!-- Total Time Hero -->
        <div class="stats w-full shadow-sm bg-base-200/50 mb-6">
          <div class="stat place-items-center py-4">
            <div class="stat-title text-base-content/60">Today's Activity</div>
            <div class="stat-value text-primary text-3xl">
              {{ topSites ? prettyMs(totalTime, { compact: true }) : '...' }}
            </div>
            <div class="stat-desc mt-1">Total browsing time</div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="!topSites" class="flex flex-col gap-4">
          <div v-for="i in skeletonRows" :key="`skeleton-${i}`" class="flex items-center gap-4">
            <div class="skeleton h-10 w-10 rounded-full shrink-0"></div>
            <div class="flex flex-col gap-2 w-full">
              <div class="skeleton h-4 w-28"></div>
              <div class="skeleton h-3 w-full"></div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="topSites.length === 0" class="hero py-10">
          <div class="hero-content text-center">
            <div class="max-w-md">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-base-content/20 mx-auto mb-2" width="24" height="24" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"></path>
                <path d="M12 7v5l3 3"></path>
              </svg>
              <p class="py-2 text-base-content/60">No activity recorded today.</p>
            </div>
          </div>
        </div>

        <!-- Sites List -->
        <ul v-else class="list bg-base-100 w-full">
          <li class="list-row text-xs uppercase tracking-wide font-semibold text-base-content/50 pb-2 px-2 border-b border-base-200">
            <div class="w-8 text-center">#</div>
            <div class="flex-1">Domain</div>
            <div class="w-16 text-right">Time</div>
            <!-- Spacer to align with arrow icon in rows -->
            <div class="w-4"></div>
          </li>

          <li
            v-for="(site, index) in topSites"
            :key="`${site.date}-${site.domain}`"
            class="list-row hover:bg-base-200/50 cursor-pointer rounded-box transition-colors p-2"
            @click="selectedDomain = site.domain"
          >
            <div class="w-8 flex items-center justify-center font-mono text-base-content/40 text-sm">
              {{ index + 1 }}
            </div>

            <div class="flex flex-col gap-1 flex-1 min-w-0 justify-center">
              <div class="font-medium truncate">{{ site.domain }}</div>
              <progress 
                class="progress progress-primary h-1.5 w-full bg-base-200"
                :value="sitePercentage(site.duration)"
                max="100"
              />
            </div>

            <div class="w-16 text-right font-medium text-sm self-center">
               {{ prettyMs(site.duration, { compact: true }) }}
            </div>

            <div class="text-xs text-base-content/40 self-center">
               <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
            </div>
          </li>
        </ul>
      </template>

      <!-- Page Details View -->
      <template v-else>
        <!-- Loading State -->
        <div v-if="!pageDetails" class="flex flex-col gap-4">
           <div v-for="i in skeletonRows" :key="`skeleton-detail-${i}`" class="flex items-center gap-4">
             <div class="flex flex-col gap-2 w-full">
              <div class="skeleton h-4 w-3/4"></div>
              <div class="skeleton h-3 w-1/2"></div>
            </div>
           </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="pageDetails.length === 0" class="hero py-10">
          <div class="hero-content text-center">
             <div class="max-w-md">
               <p class="py-2 text-base-content/60">No pages visited for this domain.</p>
             </div>
          </div>
        </div>

        <!-- Pages List -->
        <ul v-else class="list bg-base-100 w-full">
           <li class="list-row text-xs uppercase tracking-wide font-semibold text-base-content/50 pb-2 px-2 border-b border-base-200 items-end">
            <div class="flex-1">Pages visited</div>
            <div class="w-16 text-right">Duration</div>
          </li>

          <li
            v-for="(page, index) in pageDetails"
            :key="`${page.date}-${page.domain}-${page.path}`"
            class="list-row hover:bg-base-200/50 rounded-box transition-colors p-2"
          >
            <div class="flex flex-col gap-1 flex-1 min-w-0">
               <div class="font-medium truncate text-sm" :title="page.title || 'Untitled'">
                 {{ page.title || 'Untitled' }}
               </div>
               <div class="text-xs text-base-content/60 truncate font-mono" :title="page.fullPath">
                 {{ page.path }}
               </div>
               <progress
                class="progress progress-secondary h-1 w-full bg-base-200 mt-1"
                :value="pagePercentage(page.duration)"
                max="100"
              />
            </div>
             <div class="w-16 text-right font-medium text-sm self-start mt-0.5">
               {{ prettyMs(page.duration, { compact: true }) }}
            </div>
          </li>
        </ul>
      </template>

    </div>
  </div>
</template>

<style scoped>
/* Scoped styles mainly for transition, everything else is utility classes */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 200ms ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
