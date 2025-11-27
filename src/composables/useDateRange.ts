import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  formatDate,
  parseDate,
  getStartOfWeek,
  getEndOfWeek,
  getStartOfMonth,
  getEndOfMonth,
  addDays,
  addMonths
} from '@/utils/dateUtils';

export type ViewMode = 'day' | 'week' | 'month';

/**
 * Manage and navigate a date range and its view mode while keeping values synchronized with the route query.
 *
 * Exposes reactive values for the current view ('day' | 'week' | 'month'), the reference date, computed start/end dates for the current view, a human-friendly label, and navigation helpers.
 *
 * @returns An object containing:
 * - `view`: reactive view mode (`'day' | 'week' | 'month'`) that reads from and writes to `route.query.view`.
 * - `date`: reactive ISO-like date string that reads from and writes to `route.query.date`.
 * - `startDate`: computed start date string for the current view.
 * - `endDate`: computed end date string for the current view.
 * - `label`: computed display label for the current range (e.g., "Today", "Jan 1 - Jan 7", "January 2025").
 * - `next`: function that advances the reference date by one day, one week, or one month depending on `view`.
 * - `prev`: function that moves the reference date backward by one day, one week, or one month depending on `view`.
 * - `canNext`: computed boolean that is `true` when the current range ends before today (forward navigation allowed), `false` otherwise.
 */
export function useDateRange() {
  const route = useRoute();
  const router = useRouter();

  // Current view mode (default to day)
  const view = computed<ViewMode>({
    get: () => {
      const v = route.query.view as string | undefined;
      return (v === 'day' || v === 'week' || v === 'month') ? v : 'day';
    },
    set: (v) => { void router.replace({ query: { ...route.query, view: v } }); }
  });

  // Current reference date (default to today)
  const date = computed<string>({
    get: () => (route.query.date as string) || formatDate(new Date()),
    set: (d) => { void router.replace({ query: { ...route.query, date: d } }); }
  });

  // Reference date object
  const dateObj = computed(() => parseDate(date.value));

  // Calculated start date based on view
  const startDate = computed(() => {
    if (view.value === 'week') return formatDate(getStartOfWeek(dateObj.value));
    if (view.value === 'month') return formatDate(getStartOfMonth(dateObj.value));
    return date.value;
  });

  // Calculated end date based on view
  const endDate = computed(() => {
    if (view.value === 'week') return formatDate(getEndOfWeek(dateObj.value));
    if (view.value === 'month') return formatDate(getEndOfMonth(dateObj.value));
    return date.value;
  });

  // Navigate to next period
  const next = () => {
    if (view.value === 'day') {
      date.value = formatDate(addDays(dateObj.value, 1));
    } else if (view.value === 'week') {
      date.value = formatDate(addDays(dateObj.value, 7));
    } else if (view.value === 'month') {
      date.value = formatDate(addMonths(dateObj.value, 1));
    }
  };

  // Navigate to previous period
  const prev = () => {
    if (view.value === 'day') {
      date.value = formatDate(addDays(dateObj.value, -1));
    } else if (view.value === 'week') {
      date.value = formatDate(addDays(dateObj.value, -7));
    } else if (view.value === 'month') {
      date.value = formatDate(addMonths(dateObj.value, -1));
    }
  };

  // Check if we can navigate forward (don't allow future dates)
  const canNext = computed(() => {
    const today = formatDate(new Date());
    return endDate.value < today;
  });

  // Label for display
  const label = computed(() => {
    const d = dateObj.value;
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };

    if (view.value === 'day') {
      // Check if it's today
      const today = formatDate(new Date());
      if (date.value === today) return 'Today';
      return d.toLocaleDateString(undefined, options);
    }

    if (view.value === 'week') {
      const start = parseDate(startDate.value);
      const end = parseDate(endDate.value);
      const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      return `${startStr} - ${endStr}`;
    }

    if (view.value === 'month') {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
    }

    return '';
  });

  return {
    view,
    date,
    startDate,
    endDate,
    label,
    next,
    prev,
    canNext
  };
}