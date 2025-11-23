<script lang="ts" setup>
</script>

<template>
  <UApp class="h-screen w-screen overflow-hidden flex flex-col">
    <router-view class="flex-1 overflow-hidden flex flex-col" />
  </UApp>
</template>

<style scoped>
:deep(body) {
  width: 400px;
  height: 600px;
  overflow: hidden;
}
</style>
