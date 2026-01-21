<script setup lang="ts">
import { computed } from 'vue'

/**
 * Step/level indicator
 * - Shows discrete levels (like a meter)
 */
const props = defineProps<{
  /** Intensity value (0-1) */
  intensity: number
  /** Number of steps */
  steps?: number
  /** Period in ms (optional) */
  period?: number
}>()

const stepCount = computed(() => props.steps ?? 4)
const activeSteps = computed(() => Math.ceil(props.intensity * stepCount.value))
</script>

<template>
  <div class="indicator">
    <svg width="24" height="24" viewBox="0 0 24 24">
      <rect
        v-for="i in stepCount"
        :key="i"
        x="4"
        :y="22 - i * (18 / stepCount)"
        width="16"
        :height="(18 / stepCount) - 2"
        rx="1"
        fill="currentColor"
        :opacity="i <= activeSteps ? 0.9 : 0.15"
      />
    </svg>
    <span v-if="period" class="period">{{ period }}ms</span>
  </div>
</template>

<style scoped>
.indicator {
  position: relative;
  width: 24px;
  height: 24px;
  color: oklch(0.60 0.22 180);
}
.period {
  position: absolute;
  bottom: -12px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 8px;
  color: oklch(0.5 0.02 260);
  white-space: nowrap;
}
</style>
