<script setup lang="ts">
import { computed } from "vue";
import { inspectorIconMap, type InspectorIconName } from "@/components/popup/iconNames";

const props = withDefaults(
  defineProps<{
    name: InspectorIconName;
    size?: string;
  }>(),
  {
    size: "size-4",
  },
);

const iconComponent = computed(() => inspectorIconMap[props.name]);
</script>

<template>
  <component :is="iconComponent" :class="size" stroke="1.75" aria-hidden="true" />
</template>
