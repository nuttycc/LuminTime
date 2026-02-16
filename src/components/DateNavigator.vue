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
    class="flex flex-col gap-1 w-full bg-base-100 px-2 py-1.5 border-b border-base-200 sticky top-0 z-20"
  >
    <!-- Row 1: Date Navigation (primary) -->
    <div class="group flex items-center justify-center gap-1">
      <button
        class="btn btn-ghost btn-circle btn-xs opacity-20 group-hover:opacity-100 transition-opacity"
        :aria-label="prevTip"
        @click="emit('prev')"
      >
        <svg class="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>

      <div class="flex items-center gap-1.5 px-1">
        <span class="font-bold text-sm select-none">{{ label }}</span>
        <button
          v-if="!isToday"
          class="btn btn-ghost btn-xs btn-circle text-primary"
          aria-label="Go to today"
          @click="emit('today')"
        >
          <svg class="size-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2.5"
              d="M9 14l-4 4m0 0l4 4m-4-4h11a4 4 0 000-8h-1"
            />
          </svg>
        </button>
      </div>

      <button
        class="btn btn-ghost btn-circle btn-xs opacity-20 group-hover:opacity-100 transition-opacity"
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

    <!-- Row 2: View Mode Switcher (secondary, smaller) -->
    <div class="flex justify-center">
      <div class="join">
        <input
          class="join-item btn btn-xs btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Day"
          :checked="view === 'day'"
          @change="emit('update:view', 'day')"
        />
        <input
          class="join-item btn btn-xs btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Week"
          :checked="view === 'week'"
          @change="emit('update:view', 'week')"
        />
        <input
          class="join-item btn btn-xs btn-soft"
          type="radio"
          name="viewoptions"
          aria-label="Month"
          :checked="view === 'month'"
          @change="emit('update:view', 'month')"
        />
      </div>
    </div>
  </div>
</template>
