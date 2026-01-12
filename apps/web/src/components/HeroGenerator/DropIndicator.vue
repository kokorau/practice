<script setup lang="ts">
defineProps<{
  /** Drop position type */
  position: 'before' | 'after' | 'into'
}>()
</script>

<template>
  <!-- Before/After: horizontal line indicator -->
  <div
    v-if="position === 'before' || position === 'after'"
    class="drop-line"
    :class="position"
  />

  <!-- Into: highlight the entire node -->
  <div
    v-else-if="position === 'into'"
    class="drop-into"
  />
</template>

<style scoped>
.drop-line {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: oklch(0.6 0.2 250);
  pointer-events: none;
  z-index: 10;
}

.drop-line::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: oklch(0.6 0.2 250);
}

.drop-line.before {
  top: 0;
  transform: translateY(-50%);
}

.drop-line.after {
  bottom: 0;
  transform: translateY(50%);
}

.drop-into {
  position: absolute;
  inset: 0;
  border: 2px solid oklch(0.6 0.2 250);
  border-radius: 0.25rem;
  pointer-events: none;
  z-index: 10;
  background-color: oklch(0.6 0.2 250 / 0.1);
}
</style>
