<script setup lang="ts">
defineProps<{
  trackKey: string
}>()
</script>

<template>
  <span class="track-key-badge">{{ trackKey }}</span>
</template>

<style scoped>
.track-key-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding: 0 0.25rem;
  border-radius: 0.25rem;
  background: oklch(0.88 0.01 260);
  font-size: 0.625rem;
  font-family: ui-monospace, monospace;
  font-weight: 600;
  color: oklch(0.45 0.02 260);
  flex-shrink: 0;
}
</style>
