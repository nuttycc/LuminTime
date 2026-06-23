<script setup lang="ts">
import type { InspectorIconName } from "./iconNames";

withDefaults(
  defineProps<{
    name: InspectorIconName;
    size?: string;
  }>(),
  {
    size: "size-4",
  },
);
</script>

<template>
  <svg
    :class="size"
    fill="none"
    stroke="currentColor"
    stroke-linecap="round"
    stroke-linejoin="round"
    stroke-width="2"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <template v-if="name === 'arrow-left'">
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </template>
    <template v-else-if="name === 'bar-chart'">
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="M8 15v-4" />
      <path d="M12 15V8" />
      <path d="M16 15V6" />
    </template>
    <template v-else-if="name === 'block'">
      <circle cx="12" cy="12" r="9" />
      <path d="m5.7 5.7 12.6 12.6" />
    </template>
    <template v-else-if="name === 'check-circle'">
      <circle cx="12" cy="12" r="9" />
      <path d="m9 12 2 2 4-4" />
    </template>
    <template v-else-if="name === 'chevron-left'">
      <path d="m15 18-6-6 6-6" />
    </template>
    <template v-else-if="name === 'chevron-right'">
      <path d="m9 18 6-6-6-6" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </template>
    <template v-else-if="name === 'code'">
      <path d="m8 9-4 3 4 3" />
      <path d="m16 9 4 3-4 3" />
      <path d="m14 5-4 14" />
    </template>
    <template v-else-if="name === 'database'">
      <ellipse cx="12" cy="5" rx="7" ry="3" />
      <path d="M5 5v6c0 1.7 3.1 3 7 3s7-1.3 7-3V5" />
      <path d="M5 11v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 3v12" />
      <path d="m8 11 4 4 4-4" />
      <path d="M4 19h16" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 5h16" />
      <path d="M7 12h10" />
      <path d="M10 19h4" />
    </template>
    <template v-else-if="name === 'filter-off'">
      <path d="M4 5h9" />
      <path d="M7 12h7" />
      <path d="M10 19h4" />
      <path d="m3 3 18 18" />
    </template>
    <template v-else-if="name === 'globe'">
      <circle cx="12" cy="12" r="9" />
      <path d="M3.6 9h16.8" />
      <path d="M3.6 15h16.8" />
      <path d="M12 3c2 2.4 3 5.4 3 9s-1 6.6-3 9" />
      <path d="M12 3c-2 2.4-3 5.4-3 9s1 6.6 3 9" />
    </template>
    <template v-else-if="name === 'help'">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 4.1 1.9c-.9.6-1.6 1.1-1.6 2.1" />
      <path d="M12 17h.01" />
    </template>
    <template v-else-if="name === 'history'">
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
      <path d="M12 7v5l3 3" />
    </template>
    <template v-else-if="name === 'info'">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </template>
    <template v-else-if="name === 'lock'">
      <path d="M7 10V7a5 5 0 0 1 10 0v3" />
      <path d="M5 10h14v10H5z" />
    </template>
    <template v-else-if="name === 'minus'">
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'more'">
      <path d="M12 5h.01" />
      <path d="M12 12h.01" />
      <path d="M12 19h.01" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </template>
    <template v-else-if="name === 'refresh'">
      <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8" />
      <path d="M4 4v4h4" />
      <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16" />
      <path d="M20 20v-4h-4" />
    </template>
    <template v-else-if="name === 'save'">
      <path d="M5 5h11l3 3v11H5z" />
      <path d="M8 5v5h8" />
      <path d="M8 19v-5h8v5" />
    </template>
    <template v-else-if="name === 'settings'">
      <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
      <path
        d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.05-2 3.46-.08-.02a1.8 1.8 0 0 0-1.98.8l-.05.09h-4l-.05-.09a1.8 1.8 0 0 0-1.98-.8l-.08.02-2-3.46.05-.05a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.67-1.14H6.2v-4h.13A1.8 1.8 0 0 0 8 8.72a1.8 1.8 0 0 0-.36-2l-.05-.05 2-3.46.08.02a1.8 1.8 0 0 0 1.98-.8l.05-.09h4l.05.09a1.8 1.8 0 0 0 1.98.8l.08-.02 2 3.46-.05.05a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.67 1.14h.13v4h-.13A1.8 1.8 0 0 0 19.4 15Z"
      />
    </template>
    <template v-else-if="name === 'trash'">
      <path d="M4 7h16" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M6 7l1 14h10l1-14" />
      <path d="M9 7V4h6v3" />
    </template>
    <template v-else-if="name === 'upload'">
      <path d="M12 21V9" />
      <path d="m8 13 4-4 4 4" />
      <path d="M4 5h16" />
    </template>
  </svg>
</template>
