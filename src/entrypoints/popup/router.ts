import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import HomeView from "./pages/HomeView.vue";
import SiteDetailView from "./pages/SiteDetailView.vue";
import HistoryView from "./pages/HistoryView.vue";
import SettingsView from "./pages/SettingsView.vue";

// oxlint-disable typescript-eslint/no-unsafe-assignment
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: HomeView,
  },
  {
    path: "/site/:hostname",
    component: SiteDetailView,
  },
  {
    path: "/history",
    component: HistoryView,
  },
  {
    path: "/settings",
    component: SettingsView,
  },
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});
