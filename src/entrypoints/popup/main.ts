import "./style.css";

import App from "./App.vue";
import { createApp } from "vue";

import { router } from "./router";

// oxlint-disable-next-line no-unsafe-argument
const app = createApp(App);

app.use(router);

app.mount("#app");
