<script setup lang="ts">
import { computed } from 'vue';
import { type ViewMode } from '@/composables/useDateRange';

const props = defineProps<{
  view: ViewMode;
  label: string;
  canNext?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:view', value: ViewMode): void;
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

const prevTip = computed(() => {
  if (props.view === 'day') return 'Previous Day';
  if (props.view === 'week') return 'Previous Week';
  return 'Previous Month';
});

const nextTip = computed(() => {
  if (props.view === 'day') return 'Next Day';
  if (props.view === 'week') return 'Next Week';
  return 'Next Month';
});
</script>

<template>
  <div class="flex flex-col gap-2 w-full bg-base-100 p-2 border-b border-base-200 sticky top-0 z-20">
    <!-- View Mode Switcher -->
    <div class="flex justify-center">
      <div class="join grid grid-cols-3 w-full max-w-xs">
        <input
          class="join-item btn btn-sm btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Day"
          :checked="view === 'day'"
          @change="emit('update:view', 'day')"
        />
        <input
          class="join-item btn btn-sm btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Week"
          :checked="view === 'week'"
          @change="emit('update:view', 'week')"
        />
        <input
          class="join-item btn btn-sm btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Month"
          :checked="view === 'month'"
          @change="emit('update:view', 'month')"
        />
      </div>
    </div>

    <!-- Date Navigation -->
    <div class="flex items-center justify-between px-2 mt-1">
      <div class="tooltip tooltip-right" :data-tip="prevTip">
        <button class="btn btn-ghost btn-circle btn-sm" @click="emit('prev')">
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <span class="font-bold text-sm select-none">{{ label }}</span>

      <div class="tooltip tooltip-left" :data-tip="nextTip">
        <button
          class="btn btn-ghost btn-circle btn-sm"
          :disabled="canNext === false"
          @click="emit('next')"
        >
          <svg class="size-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
        </button>
      </div>
    </div>
  </div>
</template>
