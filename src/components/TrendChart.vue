<script setup lang="ts">
import { computed } from 'vue';

export interface ChartItem {
  key: string;
  value: number;
  label: string;
  tooltip: string;
  active?: boolean;
}

const props = defineProps<{
  items: ChartItem[];
}>();

const maxDuration = computed(() => {
  if (props.items.length === 0) return 0;
  return Math.max(...props.items.map(d => d.value));
});

const getHeight = (duration: number) => {
  if (maxDuration.value === 0) return '0%';
  if (duration > 0 && duration / maxDuration.value < 0.05) return '5%';
  return `${(duration / maxDuration.value) * 100}%`;
};
</script>

<template>
  <div class="w-full h-32 flex items-end justify-between gap-1 px-2 pt-4 pb-1">
    <div
      v-for="item in items"
      :key="item.key"
      class="flex flex-col items-center flex-1 h-full justify-end group relative"
    >
      <!-- Tooltip -->
      <div class="absolute bottom-full mb-1 hidden group-hover:block z-10 w-max max-w-[150px]">
         <div class="bg-neutral text-neutral-content text-xs rounded py-1 px-2 shadow text-center wrap-break-word">
           {{ item.tooltip }}
         </div>
      </div>

      <!-- Bar -->
      <div
        class="w-full rounded-t transition-all duration-300 min-w-1"
        :class="[
          item.value > 0 ? 'bg-primary' : 'bg-base-300',
          item.active ? 'opacity-100 ring-2 ring-primary ring-offset-1' : 'opacity-80 hover:opacity-100'
        ]"
        :style="{ height: getHeight(item.value) }"
      ></div>

      <!-- Label -->
      <div class="text-[10px] text-base-content/50 mt-1 h-4 select-none truncate max-w-full text-center">
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
