<script setup lang="ts">
import { computed } from 'vue';
import prettyMs from 'pretty-ms';
import { motion, stagger } from 'motion-v';
import { getCellStyle as _getCellStyle } from './artHeatmap';

const props = defineProps<{
  data: number[][];
  dayLabels: string[];
  hourLabels: number[];
}>();

const rowVariants = {
  hidden: {},
  show: {
    transition: { delayChildren: stagger(0.012) },
  },
};

const cellVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { duration: 0.3, type: 'spring' as const, bounce: 0.2 } },
};

const maxVal = computed(() => {
  let max = 0;
  for (const row of props.data) {
    for (const val of row) {
      if (val > max) max = val;
    }
  }
  return max;
});

const getCellStyle = (val: number, dayIdx: number, hour: number) =>
  _getCellStyle(val, maxVal.value, dayIdx, hour);

const formatTooltip = (dayIdx: number, hour: number): string => {
  const value = props.data[dayIdx][hour];
  return `${props.dayLabels[dayIdx]} ${hour}:00 – ${prettyMs(value, { compact: true })}`;
};
</script>

<template>
  <!-- Hour labels -->
  <div class="grid gap-px ml-8" style="grid-template-columns: repeat(24, minmax(0, 1fr))">
    <div
      v-for="h in 24"
      :key="'hl-' + h"
      class="text-center text-[8px] text-base-content/40 select-none"
    >
      {{ hourLabels.includes(h - 1) ? (h - 1) : '' }}
    </div>
  </div>

  <!-- Heatmap rows -->
  <motion.div
    v-for="(row, dayIdx) in data"
    :key="'day-' + dayIdx"
    class="flex items-center gap-1"
    :variants="rowVariants"
    initial="hidden"
    animate="show"
  >
    <!-- Day label -->
    <div class="w-7 text-[10px] text-base-content/50 text-right shrink-0 select-none">
      {{ dayLabels[dayIdx] }}
    </div>

    <!-- Cells -->
    <div class="grid gap-px flex-1" style="grid-template-columns: repeat(24, minmax(0, 1fr))">
      <motion.div
        v-for="(val, hour) in row"
        :key="'c-' + dayIdx + '-' + hour"
        :variants="cellVariants"
        class="aspect-square group relative cursor-default transition-[box-shadow] duration-200"
        :style="getCellStyle(val, dayIdx, hour)"
      >
        <!-- Tooltip -->
        <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 w-max">
          <div class="bg-neutral text-neutral-content text-[10px] rounded py-0.5 px-1.5 shadow text-center whitespace-nowrap">
            {{ formatTooltip(dayIdx, hour) }}
          </div>
        </div>
      </motion.div>
    </div>
  </motion.div>
</template>
