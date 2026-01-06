<script setup lang="ts">
import { ref, computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Internal canvas width */
  canvasWidth?: number
  /** Internal canvas height */
  canvasHeight?: number
  /** Display width (optional, defaults to canvasWidth) */
  displayWidth?: number
  /** Display height (optional, defaults to canvasHeight) */
  displayHeight?: number
}>(), {
  canvasWidth: 640,
  canvasHeight: 360,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)

// Display size (use props or default to canvas size)
const displayW = computed(() => props.displayWidth ?? props.canvasWidth)
const displayH = computed(() => props.displayHeight ?? props.canvasHeight)

// Calculate scale
const scale = computed(() => displayW.value / props.canvasWidth)

// Container style
const containerStyle = computed(() => ({
  width: `${displayW.value}px`,
  height: `${displayH.value}px`,
}))

defineExpose({
  canvas: canvasRef,
})
</script>

<template>
  <div class="scaled-canvas-container" :style="containerStyle">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="scaled-canvas"
      :style="{ transform: `scale(${scale})` }"
    />
    <slot />
  </div>
</template>

<style scoped>
.scaled-canvas-container {
  position: relative;
  overflow: hidden;
}

.scaled-canvas {
  transform-origin: top left;
  display: block;
}
</style>
