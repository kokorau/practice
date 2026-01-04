<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  /** Internal canvas width */
  canvasWidth?: number
  /** Internal canvas height */
  canvasHeight?: number
}>(), {
  canvasWidth: 640,
  canvasHeight: 360,
})

const canvasRef = ref<HTMLCanvasElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)
const containerWidth = ref(0)

// Calculate scale based on container width
const scale = computed(() => {
  if (containerWidth.value === 0) return 1
  return containerWidth.value / props.canvasWidth
})

// Observe container size
let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        containerWidth.value = entry.contentRect.width
      }
    })
    resizeObserver.observe(containerRef.value)
    // Initial measurement
    containerWidth.value = containerRef.value.clientWidth
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})

defineExpose({
  canvas: canvasRef,
})
</script>

<template>
  <div ref="containerRef" class="scaled-canvas-container">
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
  width: 100%;
  overflow: hidden;
}

.scaled-canvas {
  transform-origin: top left;
  display: block;
}
</style>
