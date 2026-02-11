import { type } from "arktype";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  addDays,
  addMonths,
  formatDate,
  getEndOfMonth,
  getEndOfWeek,
  getStartOfMonth,
  getStartOfWeek,
  parseDate,
} from "@/utils/dateUtils";

export type ViewMode = "day" | "week" | "month";

const ViewModeSchema = type("'day' | 'week' | 'month'");
const DateQuerySchema = type("/^\\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\\d|3[01])$/");

const SHORT_MONTH_DAY_FORMAT: Intl.DateTimeFormatOptions = {
  month: "short",
  day: "numeric",
};

function getTodayDateStr(): string {
  return formatDate(new Date());
}

function normalizeViewMode(value: unknown): ViewMode {
  const result = ViewModeSchema(value);

  if (!(result instanceof type.errors)) {
    return result;
  }

  return "day";
}

function normalizeDate(value: unknown): string {
  const result = DateQuerySchema(value);

  if (!(result instanceof type.errors)) {
    return result;
  }

  return getTodayDateStr();
}

export function useDateRange() {
  const route = useRoute();
  const router = useRouter();

  const view = computed<ViewMode>({
    get: () => normalizeViewMode(route.query.view),
    set: (value) => {
      void router.replace({ query: { ...route.query, view: value } });
    },
  });

  const date = computed<string>({
    get: () => normalizeDate(route.query.date),
    set: (value) => {
      void router.replace({ query: { ...route.query, date: value } });
    },
  });

  const dateObj = computed<Date>(() => parseDate(date.value));

  const startDate = computed<string>(() => {
    switch (view.value) {
      case "week":
        return formatDate(getStartOfWeek(dateObj.value));
      case "month":
        return formatDate(getStartOfMonth(dateObj.value));
      default:
        return date.value;
    }
  });

  const endDate = computed<string>(() => {
    switch (view.value) {
      case "week":
        return formatDate(getEndOfWeek(dateObj.value));
      case "month":
        return formatDate(getEndOfMonth(dateObj.value));
      default:
        return date.value;
    }
  });

  function navigate(direction: 1 | -1): void {
    switch (view.value) {
      case "week":
        date.value = formatDate(addDays(dateObj.value, 7 * direction));
        return;
      case "month":
        date.value = formatDate(addMonths(dateObj.value, direction));
        return;
      default:
        date.value = formatDate(addDays(dateObj.value, direction));
    }
  }

  function next(): void {
    navigate(1);
  }

  function prev(): void {
    navigate(-1);
  }

  function goToday(): void {
    date.value = getTodayDateStr();
  }

  const isToday = computed<boolean>(() => {
    const today = getTodayDateStr();
    return startDate.value <= today && today <= endDate.value;
  });

  const canNext = computed<boolean>(() => {
    const today = getTodayDateStr();
    return endDate.value < today;
  });

  const label = computed<string>(() => {
    const currentDate = dateObj.value;

    if (view.value === "day") {
      if (date.value === getTodayDateStr()) {
        return "Today";
      }

      return currentDate.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    }

    if (view.value === "week") {
      const start = parseDate(startDate.value);
      const end = parseDate(endDate.value);

      return `${start.toLocaleDateString(undefined, SHORT_MONTH_DAY_FORMAT)} - ${end.toLocaleDateString(undefined, SHORT_MONTH_DAY_FORMAT)}`;
    }

    return currentDate.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
    });
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
