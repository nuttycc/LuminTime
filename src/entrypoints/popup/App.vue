<script lang="ts" setup>
</script>

<template>
  <div class="popup-root">
    <div class="popup-scroll">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>
