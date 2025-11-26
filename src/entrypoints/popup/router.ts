import { createMemoryHistory, createRouter, type RouteRecordRaw } from "vue-router";
import HomeView from "./pages/HomeView.vue";

// oxlint-disable typescript-eslint/no-unsafe-assignment
const routes: RouteRecordRaw[] = [{ path: "/", component: HomeView }];

export const router = createRouter({
  history: createMemoryHistory(),
  routes,
});
