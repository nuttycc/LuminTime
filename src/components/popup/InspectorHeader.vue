<script setup lang="ts">
import InspectorIconButton from "@/components/popup/InspectorIconButton.vue";

withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    showBack?: boolean;
  }>(),
  {
    subtitle: "",
    showBack: true,
  },
);

const emit = defineEmits<{
  (e: "back"): void;
}>();
</script>

<template>
  <header
    class="flex h-12 shrink-0 items-center justify-between border-b border-base-300 bg-base-100 px-3"
  >
    <div class="flex min-w-0 items-center gap-2">
      <InspectorIconButton
        v-if="showBack"
        icon="arrow-left"
        label="Go back"
        @click="emit('back')"
      />
      <div class="min-w-0">
        <h1 class="truncate text-sm font-semibold leading-5 text-base-content">
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="truncate text-[10px] font-bold leading-3 tracking-[0.05em] text-outline uppercase"
        >
          {{ subtitle }}
        </p>
      </div>
    </div>

    <div class="flex shrink-0 items-center gap-1">
      <slot name="actions" />
    </div>
  </header>
</template>
