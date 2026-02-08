<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import prettyMs from 'pretty-ms';
import { useDateRange, type ViewMode } from '@/composables/useDateRange';
import { getAggregatedPages, deleteSiteData } from '@/db/service';
import type { IPageStat } from '@/db/types';
import { useLiveQuery } from '@/composables/useDexieLiveQuery';
import { addToBlocklist, removeFromBlocklist, getBlocklist, isHostnameBlocked } from '@/db/blocklist';
import DateNavigator from '@/components/DateNavigator.vue';

const confirmingBlock = ref(false);
const confirmingUnblock = ref(false);
const confirmingDelete = ref(false);
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null);

const route = useRoute();
const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, goToday, isToday, canNext } = useDateRange();

const hostname = computed(() => route.params.hostname as string);

const pages = useLiveQuery<IPageStat[]>(
  () => {
    if (!hostname.value) return Promise.resolve([]);
    return getAggregatedPages(hostname.value, startDate.value, endDate.value);
  },
  [],
  [hostname, startDate, endDate],
);

const blocklist = useLiveQuery<string[]>(
  () => getBlocklist(),
  [],
  [hostname],
);

const isBlocked = computed(() => isHostnameBlocked(hostname.value, blocklist.value));

const currentUrl = ref('');

onMounted(async () => {
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

const getPageLabel = (page: IPageStat): string => {
  const duration = prettyMs(page.duration, { secondsDecimalDigits: 0, verbose: true });
  const title = page.title || 'Untitled';
  return `${title}, path ${page.path}, time spent ${duration}`;
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

const goToSiteHistory = () => {
  router.push({
    path: '/history',
    query: { view: view.value, date: date.value, hostname: hostname.value }
  });
};

const goToPageHistory = (p: string) => {
  router.push({
    path: '/history',
    query: { view: view.value, date: date.value, hostname: hostname.value, path: p }
  });
};

const closeDropdown = () => {
  (document.activeElement as HTMLElement)?.blur();
  confirmingBlock.value = false;
  confirmingUnblock.value = false;
  confirmingDelete.value = false;
};

const notifyBlocklistUpdate = () => {
  browser.runtime.sendMessage("blocklist-updated").catch(() => {});
};

const handleBlockSite = async () => {
  const added = await addToBlocklist(hostname.value);
  if (added) notifyBlocklistUpdate();
  closeDropdown();
};

const handleUnblockSite = async () => {
  const removed = await removeFromBlocklist(hostname.value);
  if (removed) notifyBlocklistUpdate();
  closeDropdown();
};

const handleDeleteSiteData = async () => {
  message.value = null;
  let deleted = false;

  try {
    await deleteSiteData(hostname.value);
    deleted = true;
  } catch (e) {
    console.error('Failed to delete site data', e);
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    message.value = { text: `Delete failed: ${errorMessage}`, type: 'error' };
  } finally {
    closeDropdown();
  }

  if (deleted) {
    goBack();
  }
};
</script>

<template>
  <div class="flex flex-col min-h-0 bg-base-100">
    <!-- Custom Header -->
    <div class="navbar bg-base-100 sticky top-0 z-30 border-b border-base-200 min-h-12 px-2">
      <div class="navbar-start w-1/4">
        <div class="tooltip tooltip-right" data-tip="Back to Dashboard">
          <button class="btn btn-ghost btn-circle btn-sm" aria-label="Back to Dashboard" @click="goBack">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>
      </div>
      <div class="navbar-center w-2/4 justify-center flex-col gap-0.5">
        <h1 class="text-sm font-bold truncate w-fit flex items-center gap-1">
          {{ hostname }}
          <span v-if="isBlocked" class="badge badge-error badge-xs text-[9px] font-bold shrink-0">BLOCKED</span>
        </h1>
        <div class="text-[10px] text-base-content/60 font-mono">
           {{ prettyMs(totalDuration, { secondsDecimalDigits: 0 }) }}
        </div>
      </div>
      <div class="navbar-end w-1/4">
        <div class="dropdown dropdown-end">
          <div tabindex="0" role="button" class="btn btn-ghost btn-circle btn-sm" aria-label="More actions">
            <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
          </div>
          <ul tabindex="-1" class="dropdown-content menu bg-base-200 rounded-box z-50 mt-2 w-44 p-2 shadow-md">
            <li>
              <a @click="goToSiteHistory(); closeDropdown()">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                Site History
              </a>
            </li>
            <hr class="my-1 border-base-content/10" />
            <template v-if="isBlocked">
              <li v-if="!confirmingUnblock">
                <a class="text-success" @click.stop="confirmingUnblock = true">
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  Unblock Site
                </a>
              </li>
              <li v-else>
                <a class="bg-success/15 text-success font-bold" @click="handleUnblockSite()">
                  Confirm Unblock?
                </a>
              </li>
            </template>
            <template v-else>
              <li v-if="!confirmingBlock">
                <a class="text-warning" @click.stop="confirmingBlock = true">
                  <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Block Site
                </a>
              </li>
              <li v-else>
                <a class="bg-warning/15 text-warning font-bold" @click="handleBlockSite()">
                  Confirm Block?
                </a>
              </li>
            </template>
            <hr class="my-1 border-base-content/10" />
            <li v-if="!confirmingDelete">
              <a class="text-error" @click.stop="confirmingDelete = true">
                <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                Delete Data
              </a>
            </li>
            <li v-else>
              <a class="bg-error/15 text-error font-bold" @click="handleDeleteSiteData()">
                Confirm Delete?
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Date Navigator (Reused) -->
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
    <div class="flex-1 p-4">
      <div v-if="message" :class="['alert text-sm py-2 mb-3', message.type === 'success' ? 'alert-success' : 'alert-error']">
        <span>{{ message.text }}</span>
      </div>

      <div v-if="pages.length === 0" class="flex flex-col items-center justify-center py-10 gap-2 opacity-60">
        <svg class="size-12 text-base-content/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        <div class="text-sm font-medium">No pages visited</div>
        <div class="text-xs">No specific pages recorded for this domain in the selected period.</div>
      </div>

      <ul v-else class="flex flex-col gap-2">
         <li
            v-for="page in pages"
            :key="page.path"
            class="flex flex-col gap-1 p-3 hover:bg-base-200/50 rounded-box transition-colors border border-base-100 hover:border-base-200 cursor-pointer focus-visible:ring-2 focus-visible:outline-none"
            :class="{ 'bg-primary/10 border-primary/20': isActivePage(page) }"
            role="button"
            tabindex="0"
            :aria-label="getPageLabel(page)"
            @click="goToPageHistory(page.path)"
            @keydown.enter="goToPageHistory(page.path)"
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
                 {{ prettyMs(page.duration, { secondsDecimalDigits: 0 }) }}
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
