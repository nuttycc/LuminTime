<script setup lang="ts">
import { computed } from 'vue';

export interface ChartItem {
  key: string;
  value: number;
  label?: string;
  tooltip: string;
  ariaLabel?: string;
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

// 计算标签显示间隔，避免重叠
const labelStep = computed(() => {
  const len = props.items.length;
  if (len <= 7) return 1;
  if (len <= 14) return 2;
  return Math.ceil(len / 7);
});

const shouldShowLabel = (index: number) => {
  const len = props.items.length;
  // 始终显示第一个和最后一个
  if (index === 0 || index === len - 1) return true;
  return index % labelStep.value === 0;
};
</script>

<template>
  <div
    class="w-full h-26 flex items-end justify-between gap-1 px-2 pt-3 pb-3"
    role="list"
    aria-label="Activity trend chart"
  >
    <div
      v-for="(item, index) in items"
      :key="item.key"
      class="flex flex-col items-center flex-1 h-full justify-end group relative rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      role="listitem"
      tabindex="0"
      :aria-label="item.ariaLabel || item.tooltip"
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
      <div
        v-if="item.label && shouldShowLabel(index)"
        class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-base-content/50 select-none whitespace-nowrap"
        aria-hidden="true"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
