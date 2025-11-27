<script setup lang="ts">
import { computed } from 'vue';
import prettyMs from 'pretty-ms';

const props = defineProps<{
  data: { date: string; duration: number }[];
  highlightDate?: string; // Optional: highlight a specific date (e.g. today)
}>();

const maxDuration = computed(() => {
  if (props.data.length === 0) return 0;
  return Math.max(...props.data.map(d => d.duration));
});

const getHeight = (duration: number) => {
  if (maxDuration.value === 0) return '0%';
  // Min height 4px so it's visible if there is ANY data but very small relative to max
  if (duration > 0 && duration / maxDuration.value < 0.05) return '5%';
  return `${(duration / maxDuration.value) * 100}%`;
};

// Helper to format date label
const getLabel = (dateStr: string) => {
  const date = new Date(dateStr + 'T00:00:00'); // ensure local parsing
  // If many bars (month view), just show day number. If fewer (week), show day name.
  if (props.data.length > 10) {
    return date.getDate().toString();
  }
  return date.toLocaleDateString(undefined, { weekday: 'narrow' }); // M, T, W...
};

const getTooltip = (item: { date: string; duration: number }) => {
  const date = new Date(item.date + 'T00:00:00');
  const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const timeStr = prettyMs(item.duration, { compact: true });
  return `${dateStr}: ${timeStr}`;
};
</script>

<template>
  <div class="w-full h-32 flex items-end justify-between gap-1 px-2 pt-4 pb-1">
    <div
      v-for="item in data"
      :key="item.date"
      class="flex flex-col items-center flex-1 h-full justify-end group relative"
    >
      <!-- Tooltip (simple CSS) -->
      <div class="absolute bottom-full mb-1 hidden group-hover:block z-10">
         <div class="bg-neutral text-neutral-content text-xs rounded py-1 px-2 whitespace-nowrap shadow">
           {{ getTooltip(item) }}
         </div>
      </div>

      <!-- Bar -->
      <div
        class="w-full rounded-t transition-all duration-300"
        :class="[
          item.duration > 0 ? 'bg-primary' : 'bg-base-300',
          highlightDate === item.date ? 'opacity-100 ring-2 ring-primary ring-offset-1' : 'opacity-80 hover:opacity-100'
        ]"
        :style="{ height: getHeight(item.duration) }"
      ></div>

      <!-- Label -->
      <div class="text-[10px] text-base-content/50 mt-1 h-4 select-none">
        {{ getLabel(item.date) }}
      </div>
    </div>
  </div>
</template>
