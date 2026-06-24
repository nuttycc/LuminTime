<script setup lang="ts">
import InspectorIcon from "@/components/popup/InspectorIcon.vue";
import type { InspectorIconName } from "@/components/popup/iconNames";

withDefaults(
  defineProps<{
    icon: InspectorIconName;
    label: string;
    disabled?: boolean;
    tone?: "default" | "primary" | "danger";
    type?: "button" | "submit";
  }>(),
  {
    disabled: false,
    tone: "default",
    type: "button",
  },
);
</script>

<template>
  <button
    :type="type"
    :aria-label="label"
    :title="label"
    :disabled="disabled"
    class="flex size-7 shrink-0 items-center justify-center rounded border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-35"
    :class="{
      'text-base-content/70 hover:border-base-300 hover:bg-base-200 hover:text-base-content':
        tone === 'default',
      'text-primary hover:border-primary/40 hover:bg-primary/10': tone === 'primary',
      'text-error hover:border-error/40 hover:bg-error/10': tone === 'danger',
    }"
  >
    <InspectorIcon :name="icon" />
  </button>
</template>
