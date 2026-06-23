<script setup lang="ts">
import { computed } from "vue";

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
  return Math.max(...props.items.map((d) => d.value));
});

const getHeight = (duration: number) => {
  if (maxDuration.value === 0) return "0%";
  if (duration > 0 && duration / maxDuration.value < 0.05) return "5%";
  return `${(duration / maxDuration.value) * 100}%`;
};

const labelStep = computed(() => {
  const len = props.items.length;
  if (len <= 7) return 1;
  if (len <= 14) return 2;
  return Math.ceil(len / 7);
});

const shouldShowLabel = (index: number) => {
  const len = props.items.length;
  if (index === 0 || index === len - 1) return true;
  return index % labelStep.value === 0;
};
</script>

<template>
  <div
    class="flex h-24 w-full items-end justify-between gap-1 px-1 pt-3 pb-3"
    role="list"
    aria-label="Activity trend chart"
  >
    <div
      v-for="(item, index) in items"
      :key="item.key"
      class="group relative flex h-full flex-1 flex-col items-center justify-end rounded-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
      role="listitem"
      tabindex="0"
      :aria-label="item.ariaLabel || item.tooltip"
    >
      <div
        class="absolute bottom-full z-10 mb-1 hidden w-max max-w-[150px] group-hover:block group-focus-within:block"
      >
        <div
          class="rounded bg-neutral px-2 py-1 text-center text-xs break-words text-neutral-content shadow"
        >
          {{ item.tooltip }}
        </div>
      </div>

      <div
        class="min-w-1 w-full rounded-sm border transition-[height,opacity] duration-200 ease-out motion-reduce:transition-none"
        :class="[
          item.value > 0 ? 'border-primary/30 bg-primary/35' : 'border-base-300 bg-base-300/60',
          item.active
            ? 'bg-primary opacity-100 ring-1 ring-primary ring-offset-1 ring-offset-base-100'
            : 'opacity-80 hover:opacity-100',
        ]"
        :style="{ height: getHeight(item.value) }"
      />

      <div
        v-if="item.label && shouldShowLabel(index)"
        class="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] whitespace-nowrap text-base-content/50 select-none"
        aria-hidden="true"
      >
        {{ item.label }}
      </div>
    </div>
  </div>
</template>
