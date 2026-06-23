<script setup lang="ts">
import { type ViewMode } from "@/composables/useDateRange";
import InspectorIconButton from "./InspectorIconButton.vue";

defineProps<{
  view: ViewMode;
  label: string;
  canNext?: boolean;
  isToday?: boolean;
}>();

const emit = defineEmits<{
  (e: "update:view", value: ViewMode): void;
  (e: "prev"): void;
  (e: "next"): void;
  (e: "today"): void;
}>();

const options: { label: string; value: ViewMode }[] = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
];
</script>

<template>
  <section class="shrink-0 border-b border-base-300 bg-surface-lowest px-3 py-2">
    <div class="flex items-center justify-between gap-2">
      <div class="flex min-w-0 items-center gap-1">
        <InspectorIconButton icon="chevron-left" label="Previous period" @click="emit('prev')" />
        <button
          class="min-w-0 truncate rounded px-1.5 py-1 text-sm font-semibold leading-5 transition-colors hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :class="{ 'text-primary': !isToday }"
          :aria-label="isToday ? label : 'Go to today'"
          @click="!isToday && emit('today')"
        >
          {{ label }}
        </button>
        <InspectorIconButton
          icon="chevron-right"
          label="Next period"
          :disabled="canNext === false"
          @click="emit('next')"
        />
      </div>

      <div class="flex shrink-0 rounded border border-base-300 bg-surface-low p-0.5">
        <button
          v-for="option in options"
          :key="option.value"
          class="rounded px-2.5 py-1 text-xs leading-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          :class="
            view === option.value
              ? 'bg-base-300 text-primary'
              : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
          "
          :aria-pressed="view === option.value"
          @click="emit('update:view', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </div>
  </section>
</template>
