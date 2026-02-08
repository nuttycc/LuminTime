import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  formatDate,
  parseDate,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  addDays,
  addMonths,
} from "@/utils/dateUtils";

export type ViewMode = "day" | "week" | "month";

export function useDateRange() {
  const route = useRoute();
  const router = useRouter();

  // Current view mode (default to day)
  const view = computed<ViewMode>({
    get: () => {
      const v = route.query.view as string | undefined;
      return v === "day" || v === "week" || v === "month" ? v : "day";
    },
    set: (v) => {
      void router.replace({ query: { ...route.query, view: v } });
    },
  });

  // Current reference date (default to today)
  const date = computed<string>({
    get: () => (route.query.date as string) || formatDate(new Date()),
    set: (d) => {
      void router.replace({ query: { ...route.query, date: d } });
    },
  });

  // Reference date object
  const dateObj = computed(() => parseDate(date.value));

  // Calculated start date based on view
  const startDate = computed(() => {
    switch (view.value) {
      case "week":
        return formatDate(getStartOfWeek(dateObj.value));
      case "month":
        return formatDate(getStartOfMonth(dateObj.value));
      default:
        return date.value;
    }
  });

  // Calculated end date based on view
  const endDate = computed(() => {
    switch (view.value) {
      case "week":
        return formatDate(getEndOfWeek(dateObj.value));
      case "month":
        return formatDate(getEndOfMonth(dateObj.value));
      default:
        return date.value;
    }
  });

  // Navigate by direction: 1 for next, -1 for previous
  const navigate = (direction: 1 | -1) => {
    switch (view.value) {
      case "week":
        date.value = formatDate(addDays(dateObj.value, 7 * direction));
        break;
      case "month":
        date.value = formatDate(addMonths(dateObj.value, direction));
        break;
      default:
        date.value = formatDate(addDays(dateObj.value, direction));
    }
  };

  const next = () => navigate(1);
  const prev = () => navigate(-1);

  const goToday = () => {
    date.value = formatDate(new Date());
  };

  // Whether the current view includes today
  const isToday = computed(() => {
    const today = formatDate(new Date());
    return startDate.value <= today && today <= endDate.value;
  });

  // Check if we can navigate forward (don't allow future dates)
  const canNext = computed(() => {
    const today = formatDate(new Date());
    return endDate.value < today;
  });

  // Label for display
  const label = computed(() => {
    const d = dateObj.value;
    const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };

    if (view.value === "day") {
      // Check if it's today
      const today = formatDate(new Date());
      if (date.value === today) return "Today";
      return d.toLocaleDateString(undefined, options);
    }

    if (view.value === "week") {
      const start = parseDate(startDate.value);
      const end = parseDate(endDate.value);
      const startStr = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      const endStr = end.toLocaleDateString(undefined, { month: "short", day: "numeric" });
      return `${startStr} - ${endStr}`;
    }

    if (view.value === "month") {
      return d.toLocaleDateString(undefined, { year: "numeric", month: "long" });
    }

    return "";
  });

  return {
    view,
    date,
    startDate,
    endDate,
    label,
    next,
    prev,
    goToday,
    isToday,
    canNext,
  };
}
