<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter } from "vue-router";
import { exportAllData, importData, type IExportData } from "@/db/exportImport";
import { getDatabaseStats, type IDbStats } from "@/db/diagnostics";
import { getRawRetentionDays, setRawRetentionDays } from "@/db/retention";
import {
  getBlocklist,
  addToBlocklist,
  removeFromBlocklist,
  notifyBlocklistUpdate,
} from "@/db/blocklist";
import InspectorFooter from "@/components/popup/InspectorFooter.vue";
import InspectorHeader from "@/components/popup/InspectorHeader.vue";
import InspectorIcon from "@/components/popup/InspectorIcon.vue";

const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const message = ref<{ text: string; type: "success" | "error" } | null>(null);

const dbStats = ref<IDbStats | null>(null);
const statsLoading = ref(false);
const statsError = ref<string | null>(null);

const retentionDays = ref(7);
const retentionOptions = [7, 14, 30, 90];
const projectUrl = "https://github.com/nuttycc/LuminTime";
const projectDisplayUrl = "github.com/nuttycc/LuminTime";

// --- Blocklist ---
const blocklist = ref<string[]>([]);
const newBlockHostname = ref("");

const goBack = () => {
  router.back();
};

const handleRetentionChange = async (event: Event) => {
  const target = event.target as HTMLSelectElement;
  const days = parseInt(target.value, 10);
  retentionDays.value = days;
  await setRawRetentionDays(days);
};

const handleExport = async () => {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `lumintime-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.value = { text: "Export successful!", type: "success" };
  } catch (e) {
    console.error("Export failed", e);
    message.value = { text: "Export failed: " + (e as Error).message, type: "error" };
  }
};

const triggerImport = () => {
  fileInput.value?.click();
};

const handleFileChange = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (!file) return;

  importing.value = true;
  message.value = null;

  try {
    const text = await file.text();
    const data = JSON.parse(text) as IExportData;
    await importData(data);
    message.value = { text: "Import successful!", type: "success" };

    // Refresh stats after import
    await loadStats();

    // Clear input to allow re-selecting same file if needed
    target.value = "";
  } catch (e) {
    console.error("Import failed", e);
    message.value = { text: "Import failed: " + (e as Error).message, type: "error" };
  } finally {
    importing.value = false;
  }
};

const loadStats = async () => {
  statsLoading.value = true;
  statsError.value = null;

  try {
    dbStats.value = await getDatabaseStats();
  } catch (e) {
    console.error("Failed to load stats", e);
    dbStats.value = null;
    statsError.value = (e as Error).message || "Unknown error";
  } finally {
    statsLoading.value = false;
  }
};

const formatBytes = (bytes?: number) => {
  if (bytes === undefined) return "Unknown";
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const loadBlocklist = async () => {
  blocklist.value = await getBlocklist();
};

const handleAddBlock = async () => {
  const hostname = newBlockHostname.value.trim().toLowerCase();
  if (!hostname) return;
  const added = await addToBlocklist(hostname);
  if (added) {
    blocklist.value = await getBlocklist();
    notifyBlocklistUpdate();
  }
  newBlockHostname.value = "";
};

const handleRemoveBlock = async (hostname: string) => {
  await removeFromBlocklist(hostname);
  blocklist.value = await getBlocklist();
  notifyBlocklistUpdate();
};

onMounted(async () => {
  void loadStats();
  void loadBlocklist();
  try {
    retentionDays.value = await getRawRetentionDays();
  } catch (e) {
    console.error("Failed to load retention days", e);
  }
});
</script>

<template>
  <div class="flex h-full min-h-0 flex-col bg-base-100 text-base-content">
    <InspectorHeader title="Settings" subtitle="Local data controls" @back="goBack" />

    <main class="custom-scrollbar flex-1 space-y-4 overflow-y-auto overflow-x-hidden p-3 pb-4">
      <section class="overflow-hidden rounded border border-base-300 bg-surface-low">
        <div
          class="flex items-center justify-between border-b border-base-300 bg-base-200 px-3 py-2"
        >
          <h2 class="text-[10px] font-bold leading-3 tracking-wider text-outline uppercase">
            Data Management
          </h2>
          <span class="font-mono text-[10px] leading-3 text-outline">Last export: today</span>
        </div>

        <div class="divide-y divide-base-300 p-2">
          <button
            class="flex w-full items-center justify-between rounded px-2 py-2 text-left transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            @click="handleExport"
          >
            <span class="text-sm leading-5">Export backup</span>
            <InspectorIcon name="download" size="size-4 text-primary" />
          </button>

          <button
            class="flex w-full items-center justify-between rounded px-2 py-2 text-left transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50"
            :disabled="importing"
            @click="triggerImport"
          >
            <span class="text-sm leading-5">{{
              importing ? "Importing backup" : "Import backup"
            }}</span>
            <span
              v-if="importing"
              class="size-3 animate-pulse rounded-full border border-primary bg-primary/20"
            ></span>
            <InspectorIcon v-else name="upload" size="size-4 text-primary" />
          </button>

          <input
            type="file"
            ref="fileInput"
            accept=".json"
            class="hidden"
            @change="handleFileChange"
          />
        </div>

        <div
          v-if="message"
          class="border-t border-base-300 px-3 py-2 text-xs"
          :class="message.type === 'success' ? 'text-primary' : 'text-error'"
        >
          {{ message.text }}
        </div>
      </section>

      <section class="overflow-hidden rounded border border-base-300 bg-surface-low">
        <div class="border-b border-base-300 bg-base-200 px-3 py-2">
          <h2 class="text-[10px] font-bold leading-3 tracking-wider text-outline uppercase">
            Retention
          </h2>
        </div>
        <div class="flex items-start justify-between gap-3 p-3">
          <div class="min-w-0">
            <div class="text-sm font-semibold leading-5">Raw history logs</div>
            <div class="mt-0.5 text-xs leading-4 text-base-content/60">
              Aggregate older logs into hourly summaries
            </div>
          </div>
          <select
            class="w-24 shrink-0 rounded border border-base-300 bg-base-100 px-2 py-1 font-mono text-xs text-base-content focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            :value="retentionDays"
            @change="handleRetentionChange"
          >
            <option v-for="opt in retentionOptions" :key="opt" :value="opt">{{ opt }} days</option>
          </select>
        </div>
      </section>

      <section class="overflow-hidden rounded border border-base-300 bg-surface-low">
        <div class="border-b border-base-300 bg-base-200 px-3 py-2">
          <h2 class="text-[10px] font-bold leading-3 tracking-wider text-outline uppercase">
            Blocked Sites
          </h2>
        </div>

        <div class="space-y-2 p-2">
          <form class="flex gap-2" @submit.prevent="handleAddBlock">
            <input
              v-model="newBlockHostname"
              type="text"
              class="min-w-0 flex-1 rounded border border-base-300 bg-base-100 px-2 py-1 font-mono text-xs text-base-content placeholder:text-outline focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Add hostname..."
            />
            <button
              type="submit"
              class="flex size-7 shrink-0 items-center justify-center rounded border border-base-300 text-primary transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-40"
              :disabled="!newBlockHostname.trim()"
              aria-label="Add blocked hostname"
            >
              <InspectorIcon name="plus" />
            </button>
          </form>

          <div v-if="blocklist.length === 0" class="py-2 text-center text-xs text-outline">
            No blocked sites yet.
          </div>

          <ul v-else class="max-h-28 overflow-y-auto rounded border border-base-300 bg-base-100">
            <li
              v-for="host in blocklist"
              :key="host"
              class="group flex items-center justify-between gap-2 border-b border-base-300 px-2 py-1.5 last:border-b-0 hover:bg-base-200"
            >
              <span class="truncate font-mono text-[13px] leading-4">{{ host }}</span>
              <button
                class="flex size-6 shrink-0 items-center justify-center rounded text-outline transition-colors hover:bg-error/10 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error"
                aria-label="Remove blocked hostname"
                @click="handleRemoveBlock(host)"
              >
                <InspectorIcon name="close" size="size-3.5" />
              </button>
            </li>
          </ul>
        </div>
      </section>

      <section class="overflow-hidden rounded border border-base-300 bg-surface-low">
        <div class="border-b border-base-300 bg-base-200 px-3 py-2">
          <h2 class="text-[10px] font-bold leading-3 tracking-wider text-outline uppercase">
            Database Stats
          </h2>
        </div>

        <div v-if="statsLoading" class="flex items-center justify-center py-4">
          <span
            class="size-3 animate-pulse rounded-full border border-primary bg-primary/20"
          ></span>
        </div>
        <div v-else-if="statsError" class="px-3 py-2 text-xs text-error">
          Failed to load stats: {{ statsError }}
        </div>
        <div v-else-if="dbStats" class="grid grid-cols-2 gap-px bg-base-300 p-px">
          <div class="bg-surface-low p-2 text-center">
            <div class="text-[10px] font-bold tracking-wider text-outline uppercase">
              History rows
            </div>
            <div class="mt-1 font-mono text-[13px] leading-4 text-primary">
              {{ dbStats.historyCount.toLocaleString() }}
            </div>
          </div>
          <div class="bg-surface-low p-2 text-center">
            <div class="text-[10px] font-bold tracking-wider text-outline uppercase">Site rows</div>
            <div class="mt-1 font-mono text-[13px] leading-4 text-primary">
              {{ dbStats.sitesCount.toLocaleString() }}
            </div>
          </div>
          <div class="bg-surface-low p-2 text-center">
            <div class="text-[10px] font-bold tracking-wider text-outline uppercase">Page rows</div>
            <div class="mt-1 font-mono text-[13px] leading-4 text-primary">
              {{ dbStats.pagesCount.toLocaleString() }}
            </div>
          </div>
          <div class="bg-surface-low p-2 text-center">
            <div class="text-[10px] font-bold tracking-wider text-outline uppercase">Storage</div>
            <div class="mt-1 font-mono text-[13px] leading-4 text-primary">
              {{ formatBytes(dbStats.storageUsage) }}
            </div>
          </div>
        </div>
        <div v-else class="px-3 py-2 text-xs text-outline">No stats available.</div>
      </section>

      <section class="overflow-hidden rounded border border-base-300 bg-surface-low">
        <div class="border-b border-base-300 bg-base-200 px-3 py-2">
          <h2 class="text-[10px] font-bold leading-3 tracking-wider text-outline uppercase">
            About
          </h2>
        </div>

        <a
          :href="projectUrl"
          target="_blank"
          rel="noreferrer"
          class="flex items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span class="flex min-w-0 items-center gap-2">
            <InspectorIcon name="github" size="size-4 shrink-0 text-base-content/70" />
            <span class="min-w-0">
              <span class="block text-sm leading-5">GitHub</span>
              <span class="block truncate font-mono text-[11px] leading-4 text-base-content/55">
                {{ projectDisplayUrl }}
              </span>
            </span>
          </span>
          <InspectorIcon name="external-link" size="size-3.5 shrink-0 text-outline" />
        </a>
      </section>
    </main>

    <InspectorFooter text="Settings stored locally - No sync" icon="database" />
  </div>
</template>
