import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import HomeView from "./pages/HomeView.vue";
import DomainDetailView from "./pages/DomainDetailView.vue";

// oxlint-disable typescript-eslint/no-unsafe-assignment
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: HomeView
  },
  {
    path: "/domain/:domain",
    component: DomainDetailView
  }
];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});
