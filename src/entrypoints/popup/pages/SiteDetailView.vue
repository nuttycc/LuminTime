<script setup lang="ts">
import { browser } from "wxt/browser";
import { ref, computed, nextTick, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import prettyMs from "pretty-ms";
import { useDateRange } from "@/composables/useDateRange";
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

const confirmingAction = ref<"block" | "unblock" | "delete" | null>(null);
const confirmDialog = ref<HTMLDialogElement | null>(null);
const pageDetailDialog = ref<HTMLDialogElement | null>(null);
const selectedPagePath = ref<string | null>(null);
const message = ref<{ text: string; type: "success" | "error" } | null>(null);

const route = useRoute();
const router = useRouter();
const { view, date, startDate, endDate } = useDateRange();

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
const blockAction = computed<"block" | "unblock">(() => (isBlocked.value ? "unblock" : "block"));
const blockActionLabel = computed(() => (isBlocked.value ? "Unblock domain" : "Block domain"));
const blockActionTone = computed<"default" | "primary" | "danger">(() => {
  return isBlocked.value ? "primary" : "default";
});
const confirmConfig = computed(() => {
  switch (confirmingAction.value) {
    case "delete":
      return {
        title: "Delete domain data?",
        description: "This removes locally stored history for this domain. This cannot be undone.",
        buttonLabel: "Delete data",
        buttonClass: "btn-error",
        icon: "trash" as const,
        iconClass: "text-error",
      };
    case "unblock":
      return {
        title: "Unblock domain?",
        description: "Tracking will resume for this domain when you visit it again.",
        buttonLabel: "Unblock",
        buttonClass: "btn-primary",
        icon: "check-circle" as const,
        iconClass: "text-primary",
      };
    case "block":
      return {
        title: "Block domain?",
        description: "LuminTime will stop tracking new activity for this domain.",
        buttonLabel: "Block",
        buttonClass: "btn-error",
        icon: "block" as const,
        iconClass: "text-error",
      };
    default:
      return {
        title: "Confirm action",
        description: "",
        buttonLabel: "Confirm",
        buttonClass: "btn-error",
        icon: "info" as const,
        iconClass: "text-error",
      };
  }
});

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
  if (!selectedPagePath.value) return null;
  return pages.value.find((page) => page.path === selectedPagePath.value) ?? null;
});

const totalDurationLabel = computed(() =>
  totalDuration.value > 0 ? prettyMs(totalDuration.value, { secondsDecimalDigits: 0 }) : "0s",
);

const selectedPageDurationLabel = computed(() => {
  if (!selectedPage.value) return "0s";
  return prettyMs(selectedPage.value.duration, { secondsDecimalDigits: 0 });
});

const pagePercentage = (duration: number): number => {
  if (totalDuration.value === 0) return 0;
  return Math.max(6, Math.round((duration / totalDuration.value) * 100));
};

const openPageDetail = async (page: IPageStat) => {
  selectedPagePath.value = page.path;
  await nextTick();

  if (!pageDetailDialog.value?.open) {
    pageDetailDialog.value?.showModal();
  }
};

const closePageDetail = () => {
  pageDetailDialog.value?.close();
};

const clearSelectedPage = () => {
  selectedPagePath.value = null;
};

const goBack = () => {
  // Preserve query parameters
  router.push({
    path: "/",
    query: route.query,
  });
};

const goToSiteHistory = () => {
  router.push({
    path: "/history",
    query: { view: view.value, date: date.value, hostname: hostname.value },
  });
};

const openConfirmDialog = (action: "block" | "unblock" | "delete") => {
  message.value = null;
  confirmingAction.value = action;
  if (!confirmDialog.value?.open) {
    confirmDialog.value?.showModal();
  }
};

const handleBlockSite = async () => {
  const added = await addToBlocklist(hostname.value);
  if (added) notifyBlocklistUpdate();
};

const handleUnblockSite = async () => {
  const removed = await removeFromBlocklist(hostname.value);
  if (removed) notifyBlocklistUpdate();
};

const handleDeleteSiteData = async () => {
  message.value = null;
  let deleted = false;

  try {
    await deleteSiteData(hostname.value);
    deleted = true;
  } catch (e) {
    console.error("Failed to delete site data", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    message.value = { text: `Delete failed: ${errorMessage}`, type: "error" };
  }

  if (deleted) {
    goBack();
  }
};

const handleConfirmAction = async () => {
  const action = confirmingAction.value;
  if (!action) return;

  confirmDialog.value?.close();

  if (action === "delete") {
    await handleDeleteSiteData();
    return;
  }

  if (action === "unblock") {
    await handleUnblockSite();
    return;
  }

  await handleBlockSite();
};
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <InspectorHeader :title="hostname" subtitle="Site detail" @back="goBack">
      <template #actions>
        <InspectorIconButton icon="history" label="Open site history" @click="goToSiteHistory" />
        <InspectorIconButton
          :icon="isBlocked ? 'check-circle' : 'block'"
          :label="blockActionLabel"
          :tone="blockActionTone"
          @click="openConfirmDialog(blockAction)"
        />
        <InspectorIconButton
          icon="trash"
          label="Delete domain data"
          @click="openConfirmDialog('delete')"
        />
      </template>
    </InspectorHeader>

    <dialog ref="confirmDialog" class="modal modal-middle">
      <div
        class="modal-box w-[calc(100%-24px)] max-w-[320px] rounded border border-base-300 bg-base-100 p-0 text-base-content shadow-none"
      >
        <div class="flex items-center gap-2 border-b border-base-300 px-3 py-2">
          <InspectorIcon
            :name="confirmConfig.icon"
            size="size-4 shrink-0"
            :class="confirmConfig.iconClass"
          />
          <h2 class="truncate text-sm font-semibold leading-5">{{ confirmConfig.title }}</h2>
        </div>

        <div class="space-y-2 px-3 py-3">
          <p class="text-xs leading-5 text-base-content/75">{{ confirmConfig.description }}</p>
          <div
            class="truncate rounded border border-base-300 bg-surface-low px-2 py-1 font-mono text-[11px] leading-4 text-outline"
          >
            {{ hostname }}
          </div>
        </div>

        <div class="modal-action m-0 gap-2 border-t border-base-300 px-3 py-2">
          <form method="dialog">
            <button class="btn btn-ghost btn-sm rounded">Cancel</button>
          </form>
          <button
            class="btn btn-sm rounded"
            :class="confirmConfig.buttonClass"
            @click="handleConfirmAction"
          >
            {{ confirmConfig.buttonLabel }}
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <dialog ref="pageDetailDialog" class="modal modal-bottom" @close="clearSelectedPage">
      <div
        class="modal-box custom-scrollbar max-h-[48vh] w-full max-w-none rounded-t-lg rounded-b-none border border-b-0 border-base-300 bg-base-100 p-0 text-base-content shadow-none"
      >
        <div class="mx-auto mt-2 h-1 w-8 rounded-full bg-base-300"></div>

        <div class="flex min-w-0 items-start gap-2 border-b border-base-300 px-3 py-2">
          <div class="min-w-0 flex-1">
            <div class="text-[9px] font-bold tracking-wider text-outline uppercase">Full path</div>
            <h2 class="mt-0.5 truncate text-xs font-semibold leading-4">
              {{ selectedPage?.title || "Untitled" }}
            </h2>
          </div>
          <InspectorIconButton icon="close" label="Close full path" @click="closePageDetail" />
        </div>

        <div class="px-3 py-3">
          <div
            class="max-h-24 overflow-y-auto break-all rounded border border-base-300 bg-surface-low p-2 font-mono text-[11px] leading-4 text-base-content"
          >
            {{ selectedPage?.fullPath || selectedPage?.path }}
          </div>
          <div
            class="mt-2 flex items-center justify-between gap-3 font-mono text-[10px] leading-3 text-outline"
          >
            <span>Last active: current range</span>
            <span>{{ selectedPageDurationLabel }}</span>
          </div>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button>close</button>
      </form>
    </dialog>

    <div
      v-if="message"
      class="shrink-0 border-b px-3 py-1.5 text-xs"
      :class="
        message.type === 'success'
          ? 'border-primary/40 bg-primary/10 text-primary'
          : 'border-error/40 bg-error/10 text-error'
      "
    >
      {{ message.text }}
    </div>

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
        </div>

        <div
          class="grid grid-cols-4 gap-px overflow-hidden rounded border border-base-300 bg-base-300"
        >
          <div class="bg-surface-low p-1.5 text-center">
            <InspectorIcon
              :name="isBlocked ? 'block' : 'check-circle'"
              size="mx-auto mb-0.5 size-3.5 text-primary"
            />
            <div class="text-[9px] font-bold tracking-wider text-base-content uppercase">
              {{ isBlocked ? "Blocked" : "Tracked" }}
            </div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <div class="font-mono text-[11px] leading-4 text-base-content">
              {{ totalDurationLabel }}
            </div>
            <div class="text-[9px] font-bold tracking-wider text-outline uppercase">Total</div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <div class="font-mono text-[11px] leading-4 text-base-content">
              {{ pages.length }}
            </div>
            <div class="text-[9px] font-bold tracking-wider text-outline uppercase">Pages</div>
          </div>
          <div class="bg-surface-low p-1.5 text-center">
            <InspectorIcon name="database" size="mx-auto mb-0.5 size-3.5 text-outline" />
            <div class="text-[9px] font-bold tracking-wider text-outline uppercase">Local</div>
          </div>
        </div>
      </section>

      <section class="border-b border-base-300">
        <div
          class="grid grid-cols-[1.5fr_1fr_48px] border-b border-base-300 bg-base-200 px-3 py-1.5"
        >
          <span class="text-[10px] font-bold tracking-wider text-outline uppercase">Page</span>
          <span class="text-[10px] font-bold tracking-wider text-outline uppercase">Path</span>
          <span class="text-right text-[10px] font-bold tracking-wider text-outline uppercase">
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
            type="button"
            class="relative grid w-full grid-cols-[1.5fr_1fr_48px] items-center gap-2 border-b border-base-300 px-3 py-2 text-left transition-colors last:border-b-0 hover:bg-surface-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
            :class="{ 'bg-surface-low': selectedPage?.path === page.path }"
            @click="openPageDetail(page)"
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
    </main>

    <InspectorFooter text="Local browser storage active" icon="check-circle" />
  </div>
</template>
