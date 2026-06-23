<script setup lang="ts">
import { computed } from "vue";
import { type ViewMode } from "@/composables/useDateRange";

const props = defineProps<{
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

const prevTip = computed(() => {
  if (props.view === "day") return "Previous Day";
  if (props.view === "week") return "Previous Week";
  return "Previous Month";
});

const nextTip = computed(() => {
  if (props.view === "day") return "Next Day";
  if (props.view === "week") return "Next Week";
  return "Next Month";
});
</script>

<template>
  <div
    class="sticky top-0 z-20 flex w-full items-center gap-2 border-b border-base-200 bg-base-100 px-3 py-2"
  >
    <div class="flex min-w-0 flex-1 items-center gap-1">
      <button class="btn btn-ghost btn-square btn-xs" :aria-label="prevTip" @click="emit('prev')">
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div class="flex min-w-0 flex-1 items-center gap-1.5 px-1">
        <span class="min-w-0 truncate text-sm font-semibold select-none">{{ label }}</span>
        <button
          v-if="!isToday"
          class="btn btn-ghost btn-xs h-6 min-h-6 px-1.5 text-[11px] text-primary"
          aria-label="Go to today"
          @click="emit('today')"
        >
          Today
        </button>
      </div>

      <button
        class="btn btn-ghost btn-square btn-xs"
        :class="{ 'btn-disabled': canNext === false }"
        :aria-label="nextTip"
        :disabled="canNext === false"
        @click="emit('next')"
      >
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <div class="join shrink-0">
      <input
        class="join-item btn btn-xs btn-soft px-2"
        type="radio"
        name="viewoptions"
        aria-label="Day"
        :checked="view === 'day'"
        @change="emit('update:view', 'day')"
      />
      <input
        class="join-item btn btn-xs btn-soft px-2"
        type="radio"
        name="viewoptions"
        aria-label="Week"
        :checked="view === 'week'"
        @change="emit('update:view', 'week')"
      />
      <input
        class="join-item btn btn-xs btn-soft px-2"
        type="radio"
        name="viewoptions"
        aria-label="Month"
        :checked="view === 'month'"
        @change="emit('update:view', 'month')"
      />
    </div>
  </div>
</template>
