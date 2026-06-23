<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { useDateRange, type ViewMode } from "@/composables/useDateRange";
import { getAggregatedPages, deleteSiteData } from "@/db/service";
import type { IPageStat } from "@/db/types";
import { useLiveQuery } from "@/composables/useDexieLiveQuery";
import {
  addToBlocklist,
  removeFromBlocklist,
  getBlocklist,
  isHostnameBlocked,
  notifyBlocklistUpdate,
} from "@/db/blocklist";
import InspectorFooter from "@/components/popup/InspectorFooter.vue";
import InspectorHeader from "@/components/popup/InspectorHeader.vue";
import InspectorIcon from "@/components/popup/InspectorIcon.vue";
import InspectorIconButton from "@/components/popup/InspectorIconButton.vue";
import InspectorPeriodStrip from "@/components/popup/InspectorPeriodStrip.vue";

const confirmingAction = ref<"block" | "unblock" | "delete" | null>(null);
const message = ref<{ text: string; type: "success" | "error" } | null>(null);

const route = useRoute();
const router = useRouter();
const { view, date, startDate, endDate, label, next, prev, goToday, isToday, canNext } =
  useDateRange();

const hostname = computed(() => route.params.hostname as string);

const pages = useLiveQuery<IPageStat[]>(
  () => {
    if (!hostname.value) return Promise.resolve([]);
    return getAggregatedPages(hostname.value, startDate.value, endDate.value);
  },
  [],
  [hostname, startDate, endDate],
);

const blocklist = useLiveQuery<string[]>(() => getBlocklist(), [], [hostname]);

const isBlocked = computed(() => isHostnameBlocked(hostname.value, blocklist.value));

const currentUrl = ref("");

onMounted(async () => {
  try {
    const tabs = await browser.tabs.query({ active: true, currentWindow: true });
    if (tabs.length > 0 && tabs[0].url) {
      currentUrl.value = tabs[0].url;
    }
  } catch (e) {
    console.error("Failed to get current tab", e);
  }
});

const isActivePage = (page: IPageStat) => {
  return page.fullPath === currentUrl.value;
};

const totalDuration = computed(() => {
  return pages.value.reduce((sum, p) => sum + p.duration, 0);
});

const visiblePages = computed(() => pages.value.slice(0, 6));

const selectedPage = computed(() => {
  return pages.value.find((page) => isActivePage(page)) ?? pages.value[0] ?? null;
});

const totalDurationLabel = computed(() =>
  totalDuration.value > 0 ? prettyMs(totalDuration.value, { secondsDecimalDigits: 0 }) : "0s",
);

const pagePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.max(6, Math.round((duration / totalDuration.value) * 100));
};

const getPageLabel = (page: IPageStat): string => {
  const duration = prettyMs(page.duration, { secondsDecimalDigits: 0, verbose: true });
  const title = page.title || "Untitled";
  return `${title}, path ${page.path}, time spent ${duration}`;
};

const goBack = () => {
  // Preserve query parameters
  router.push({
    path: "/",
    query: route.query,
  });
};

const updateView = (v: ViewMode) => {
  view.value = v;
};

const goToSiteHistory = () => {
  router.push({
    path: "/history",
    query: { view: view.value, date: date.value, hostname: hostname.value },
  });
};

const goToPageHistory = (p: string) => {
  router.push({
    path: "/history",
    query: { view: view.value, date: date.value, hostname: hostname.value, path: p },
  });
};

const resetConfirmations = () => {
  confirmingAction.value = null;
};

const handleBlockSite = async () => {
  const added = await addToBlocklist(hostname.value);
  if (added) notifyBlocklistUpdate();
  resetConfirmations();
};

const handleUnblockSite = async () => {
  const removed = await removeFromBlocklist(hostname.value);
  if (removed) notifyBlocklistUpdate();
  resetConfirmations();
};

const handleDeleteSiteData = async () => {
  message.value = null;
  let deleted = false;

  try {
    await deleteSiteData(hostname.value);
    deleted = true;
    resetConfirmations();
  } catch (e) {
    console.error("Failed to delete site data", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    message.value = { text: `Delete failed: ${errorMessage}`, type: "error" };
  } finally {
    resetConfirmations();
  }

  if (deleted) {
    goBack();
  }
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <InspectorHeader :title="hostname" subtitle="Site detail" @back="goBack">
      <template #actions>
        <InspectorIconButton icon="history" label="Open site history" @click="goToSiteHistory" />
        <InspectorIconButton icon="more" label="More actions" />
      </template>
    </InspectorHeader>

    <InspectorPeriodStrip
      :view="view"
      :label="label"
      :can-next="canNext"
      :is-today="isToday"
      @update:view="updateView"
      @prev="prev"
      @next="next"
      @today="goToday"
    />

    <main class="custom-scrollbar flex-1 overflow-y-auto overflow-x-hidden">
      <section class="border-b border-base-300 bg-surface-lowest p-3">
        <div class="mb-3 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span
              class="size-1.5 rounded-full"
              :class="isBlocked ? 'bg-error' : 'bg-primary'"
            ></span>
            <span class="text-xs leading-4 text-base-content">
              {{ isBlocked ? "Tracking paused" : "Track this site" }}
            </span>
          </div>
          <button
            class="rounded border border-base-300 px-2 py-1 text-[11px] leading-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="
              isBlocked
                ? 'text-primary hover:bg-primary/10'
                : 'text-base-content/70 hover:bg-base-200'
            "
            @click="confirmingAction = isBlocked ? 'unblock' : 'block'"
          >
            {{ isBlocked ? "Unblock" : "Block" }}
          </button>
        </div>

        <div
          class="grid grid-cols-4 gap-px overflow-hidden rounded border border-base-300 bg-base-300"
        >
          <div class="bg-surface-low p-1.5 text-center">
            <InspectorIcon
              :name="isBlocked ? 'block' : 'check-circle'"
              size="mx-auto mb-0.5 size-3.5 text-primary"
            />
            <div class="text-[9px] font-bold tracking-[0.05em] text-base-content uppercase">
              {{ isBlocked ? "Blocked" : "Tracked" }}
            </div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <div class="font-mono text-[11px] leading-4 text-base-content">
              {{ totalDurationLabel }}
            </div>
            <div class="text-[9px] font-bold tracking-[0.05em] text-outline uppercase">Total</div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <div class="font-mono text-[11px] leading-4 text-base-content">
              {{ pages.length }}
            </div>
            <div class="text-[9px] font-bold tracking-[0.05em] text-outline uppercase">Pages</div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <InspectorIcon name="database" size="mx-auto mb-0.5 size-3.5 text-outline" />
            <div class="text-[9px] font-bold tracking-[0.05em] text-outline uppercase">Local</div>
          </div>
        </div>
      </section>

      <section class="border-b border-base-300">
        <div
          class="grid grid-cols-[1.5fr_1fr_48px] border-b border-base-300 bg-base-200 px-3 py-1.5"
        >
          <span class="text-[10px] font-bold tracking-[0.05em] text-outline uppercase">Page</span>
          <span class="text-[10px] font-bold tracking-[0.05em] text-outline uppercase">Path</span>
          <span class="text-right text-[10px] font-bold tracking-[0.05em] text-outline uppercase">
            Time
          </span>
        </div>

        <div v-if="pages.length === 0" class="px-3 py-8 text-center">
          <div class="text-sm font-medium">No pages visited</div>
          <div class="mt-1 text-xs leading-5 text-base-content/60">
            No specific pages were recorded for this domain in the selected period.
          </div>
        </div>

        <template v-else>
          <button
            v-for="page in visiblePages"
            :key="page.path"
            class="group relative grid w-full grid-cols-[1.5fr_1fr_48px] items-center gap-2 border-b border-base-300 px-3 py-2 text-left last:border-b-0 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            :class="{ 'bg-surface-low': selectedPage?.path === page.path }"
            :aria-label="getPageLabel(page)"
            @click="goToPageHistory(page.path)"
          >
            <div
              v-if="selectedPage?.path === page.path"
              class="absolute top-0 bottom-0 left-0 w-0.5 bg-primary"
            ></div>
            <div class="min-w-0 pr-1">
              <div class="flex min-w-0 items-center gap-2">
                <span
                  v-if="isActivePage(page)"
                  class="size-1.5 shrink-0 rounded-full bg-primary"
                  aria-label="Current tab"
                ></span>
                <span
                  class="truncate text-xs leading-4"
                  :class="isActivePage(page) && 'text-primary'"
                >
                  {{ page.title || "Untitled" }}
                </span>
              </div>
              <div class="mt-1 h-0.5 overflow-hidden rounded-sm bg-base-300">
                <div
                  class="h-full bg-primary"
                  :style="{ width: `${pagePercentage(page.duration)}%` }"
                ></div>
              </div>
            </div>
            <div class="min-w-0 font-mono text-[11px] leading-4 text-outline">
              <span class="block truncate" :title="page.path">{{ page.path }}</span>
            </div>
            <div class="text-right font-mono text-[11px] leading-4 text-base-content">
              {{ prettyMs(page.duration, { secondsDecimalDigits: 0 }) }}
            </div>
          </button>
        </template>
      </section>

      <section
        v-if="selectedPage"
        class="border-b border-base-300 bg-surface-low p-3"
        aria-label="Selected page detail"
      >
        <div class="rounded border border-base-300 bg-base-100 p-2">
          <div class="text-[9px] font-bold tracking-[0.05em] text-outline uppercase">Full path</div>
          <div class="mt-1 break-all font-mono text-[11px] leading-4 text-base-content">
            {{ selectedPage.fullPath || selectedPage.path }}
          </div>
          <div class="mt-2 flex items-center justify-between gap-2">
            <span class="font-mono text-[10px] leading-3 text-outline"
              >Last active: current range</span
            >
            <button
              class="flex items-center gap-1 rounded px-1 py-0.5 text-xs text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              @click="goToPageHistory(selectedPage.path)"
            >
              View page history
              <InspectorIcon name="arrow-right" size="size-3.5" />
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-2 p-3" aria-label="Danger zone">
        <div class="text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase">
          Danger Zone
        </div>

        <div
          v-if="message"
          class="rounded border px-2 py-1.5 text-xs"
          :class="
            message.type === 'success'
              ? 'border-primary/40 text-primary'
              : 'border-error/40 text-error'
          "
        >
          {{ message.text }}
        </div>

        <button
          v-if="confirmingAction === 'block'"
          class="flex w-full items-center gap-2 rounded border border-warning/50 px-3 py-2 text-left text-warning transition-colors hover:bg-warning/10"
          @click="handleBlockSite"
        >
          <InspectorIcon name="block" />
          <span class="flex-1 text-xs">Confirm block domain</span>
        </button>
        <button
          v-else-if="confirmingAction === 'unblock'"
          class="flex w-full items-center gap-2 rounded border border-primary/50 px-3 py-2 text-left text-primary transition-colors hover:bg-primary/10"
          @click="handleUnblockSite"
        >
          <InspectorIcon name="check-circle" />
          <span class="flex-1 text-xs">Confirm unblock domain</span>
        </button>
        <button
          v-else
          class="flex w-full items-center gap-2 rounded border border-base-300 px-3 py-2 text-left text-base-content transition-colors hover:border-warning/50 hover:bg-warning/10 hover:text-warning"
          @click="confirmingAction = isBlocked ? 'unblock' : 'block'"
        >
          <InspectorIcon :name="isBlocked ? 'check-circle' : 'block'" />
          <span class="flex-1 text-xs">{{ isBlocked ? "Unblock domain" : "Block domain" }}</span>
        </button>

        <button
          v-if="confirmingAction === 'delete'"
          class="flex w-full items-center gap-2 rounded border border-error/60 px-3 py-2 text-left text-error transition-colors hover:bg-error/10"
          @click="handleDeleteSiteData"
        >
          <InspectorIcon name="trash" />
          <span class="flex-1 text-xs">Confirm delete domain data</span>
        </button>
        <button
          v-else
          class="flex w-full items-center gap-2 rounded border border-error/40 px-3 py-2 text-left text-error transition-colors hover:bg-error/10"
          @click="confirmingAction = 'delete'"
        >
          <InspectorIcon name="trash" />
          <span class="flex-1 text-xs">Delete domain data</span>
        </button>
      </section>
    </main>

    <InspectorFooter text="Local browser storage active" icon="check-circle" />
  </div>
</template>
