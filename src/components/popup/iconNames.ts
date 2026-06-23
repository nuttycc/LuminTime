import {
  IconArrowLeft,
  IconArrowRight,
  IconBan,
  IconChartBar,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconCode,
  IconDatabase,
  IconDeviceFloppy,
  IconDotsVertical,
  IconDownload,
  IconFilter,
  IconFilterOff,
  IconGlobe,
  IconHelpCircle,
  IconHistory,
  IconInfoCircle,
  IconLock,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconSettings,
  IconTrash,
  IconUpload,
  IconX,
} from "@tabler/icons-vue";
import type { Component } from "vue";

export type InspectorIconName =
  | "arrow-left"
  | "arrow-right"
  | "bar-chart"
  | "block"
  | "check-circle"
  | "chevron-left"
  | "chevron-right"
  | "clock"
  | "close"
  | "code"
  | "database"
  | "download"
  | "filter"
  | "filter-off"
  | "globe"
  | "help"
  | "history"
  | "info"
  | "lock"
  | "minus"
  | "more"
  | "plus"
  | "refresh"
  | "save"
  | "settings"
  | "trash"
  | "upload";

export const inspectorIconMap = {
  "arrow-left": IconArrowLeft,
  "arrow-right": IconArrowRight,
  "bar-chart": IconChartBar,
  block: IconBan,
  "check-circle": IconCircleCheck,
  "chevron-left": IconChevronLeft,
  "chevron-right": IconChevronRight,
  clock: IconClock,
  close: IconX,
  code: IconCode,
  database: IconDatabase,
  download: IconDownload,
  filter: IconFilter,
  "filter-off": IconFilterOff,
  globe: IconGlobe,
  help: IconHelpCircle,
  history: IconHistory,
  info: IconInfoCircle,
  lock: IconLock,
  minus: IconMinus,
  more: IconDotsVertical,
  plus: IconPlus,
  refresh: IconRefresh,
  save: IconDeviceFloppy,
  settings: IconSettings,
  trash: IconTrash,
  upload: IconUpload,
} satisfies Record<InspectorIconName, Component>;
