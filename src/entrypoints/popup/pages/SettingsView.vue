<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { exportAllData, importData, type IExportData } from '@/db/exportImport';
import { getDatabaseStats, type IDbStats } from '@/db/diagnostics';

const router = useRouter();
const fileInput = ref<HTMLInputElement | null>(null);
const importing = ref(false);
const message = ref<{ text: string; type: 'success' | 'error' } | null>(null);

const dbStats = ref<IDbStats | null>(null);

const goBack = () => {
  router.back();
};

const handleExport = async () => {
  try {
    const data = await exportAllData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `lumintime-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    message.value = { text: 'Export successful!', type: 'success' };
  } catch (e) {
    console.error('Export failed', e);
    message.value = { text: 'Export failed: ' + (e as Error).message, type: 'error' };
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
    message.value = { text: 'Import successful!', type: 'success' };

    // Refresh stats after import
    loadStats();

    // Clear input to allow re-selecting same file if needed
    target.value = '';
  } catch (e) {
    console.error('Import failed', e);
    message.value = { text: 'Import failed: ' + (e as Error).message, type: 'error' };
  } finally {
    importing.value = false;
  }
};

const loadStats = async () => {
  dbStats.value = await getDatabaseStats();
};

const formatBytes = (bytes?: number) => {
  if (bytes === undefined) return 'Unknown';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

onMounted(() => {
  loadStats();
});
</script>

<template>
  <div class="flex flex-col h-full bg-base-100">
    <!-- Navbar -->
    <div class="navbar bg-base-100 min-h-12 border-b border-base-200 px-2">
      <div class="navbar-start w-1/4">
        <button class="btn btn-ghost btn-circle btn-sm" @click="goBack">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>
      <div class="navbar-center w-2/4 justify-center">
        <div class="font-bold text-lg">Settings</div>
      </div>
      <div class="navbar-end w-1/4"></div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">

      <!-- Data Management Section -->
      <div class="flex flex-col gap-2">
        <h2 class="text-sm font-bold text-base-content/50 uppercase px-1">Data Management</h2>

        <div class="card bg-base-200 shadow-sm border border-base-300">
          <div class="card-body p-4 gap-4">
            <p class="text-sm opacity-80">
              Backup your history and statistics to a JSON file, or restore from a previous backup.
            </p>

            <div class="flex flex-col gap-3">
              <button class="btn btn-primary w-full" @click="handleExport">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Data
              </button>

              <button class="btn btn-outline w-full" @click="triggerImport" :disabled="importing">
                <span v-if="importing" class="loading loading-spinner loading-sm mr-2"></span>
                <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Import Data
              </button>

              <input
                type="file"
                ref="fileInput"
                accept=".json"
                class="hidden"
                @change="handleFileChange"
              />
            </div>

            <!-- Feedback Message -->
            <div v-if="message" :class="['alert text-sm py-2', message.type === 'success' ? 'alert-success' : 'alert-error']">
              <span>{{ message.text }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Advanced Section -->
      <div class="flex flex-col gap-2">
        <h2 class="text-sm font-bold text-base-content/50 uppercase px-1">Advanced</h2>

        <div class="card bg-base-200 shadow-sm border border-base-300">
          <div class="card-body p-4 gap-4">

            <!-- Stats -->
            <div v-if="dbStats" class="grid grid-cols-2 gap-4">
               <div class="flex flex-col">
                 <span class="text-xs opacity-60">History Rows</span>
                 <span class="font-mono text-lg font-bold">{{ dbStats.historyCount.toLocaleString() }}</span>
               </div>
               <div class="flex flex-col">
                 <span class="text-xs opacity-60">Sites Rows</span>
                 <span class="font-mono text-lg font-bold">{{ dbStats.sitesCount.toLocaleString() }}</span>
               </div>
               <div class="flex flex-col">
                 <span class="text-xs opacity-60">Pages Rows</span>
                 <span class="font-mono text-lg font-bold">{{ dbStats.pagesCount.toLocaleString() }}</span>
               </div>
               <div class="flex flex-col">
                 <span class="text-xs opacity-60">Storage Usage</span>
                 <span class="font-mono text-lg font-bold">{{ formatBytes(dbStats.storageUsage) }}</span>
                 <span class="text-[10px] opacity-40">Origin Total</span>
               </div>
            </div>
            <div v-else class="flex justify-center py-4">
              <span class="loading loading-spinner loading-md opacity-50"></span>
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>
