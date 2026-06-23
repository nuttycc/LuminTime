<script setup lang="ts">
import InspectorIcon from "./InspectorIcon.vue";
import type { InspectorIconName } from "./iconNames";

withDefaults(
  defineProps<{
    text: string;
    brand?: string;
    icon?: InspectorIconName;
  }>(),
  {
    brand: "LuminTime",
    icon: "lock",
  },
);
</script>

<template>
  <footer
    class="flex h-8 shrink-0 items-center justify-between border-t border-base-300 bg-surface-lowest px-3 font-mono text-[10px] leading-3 text-outline"
  >
    <span class="font-bold text-base-content">{{ brand }}</span>
    <span class="flex min-w-0 items-center gap-1.5">
      <InspectorIcon :name="icon" size="size-3.5 shrink-0" />
      <span class="truncate">{{ text }}</span>
    </span>
  </footer>
</template>
