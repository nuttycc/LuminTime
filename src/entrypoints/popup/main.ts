import './style.css';

import ui from '@nuxt/ui/vue-plugin'
import { createRouter, createWebHistory } from 'vue-router'

import App from './App.vue';
import { createApp } from 'vue';

// oxlint-disable-next-line no-unsafe-argument
const app = createApp(App)

const router = createRouter({
  routes: [],
  history: createWebHistory()
})

app.use(router)
app.use(ui)

app.mount('#app');
