<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { TextureRenderer, type TextureRenderSpec } from '@practice/texture'

const props = defineProps<{
  width?: number
  height?: number
  spec: TextureRenderSpec | null
}>()

const canvasRef = ref<HTMLCanvasElement | null>(null)
let renderer: TextureRenderer | null = null

const canvasWidth = props.width ?? 160
const canvasHeight = props.height ?? 90

async function initRenderer() {
  if (!canvasRef.value || !navigator.gpu) return

  try {
    renderer = await TextureRenderer.create(canvasRef.value)
    render()
  } catch (e) {
    console.error('NodePreview: WebGPU init failed', e)
  }
}

function render() {
  if (!renderer || !props.spec) return
  renderer.render(props.spec)
}

watch(() => props.spec, render, { deep: true })

onMounted(() => {
  initRenderer()
})

onUnmounted(() => {
  renderer?.destroy()
  renderer = null
})
</script>

<template>
  <canvas
    ref="canvasRef"
    :width="canvasWidth"
    :height="canvasHeight"
    class="node-canvas"
  />
</template>

<style scoped>
.node-canvas {
  display: block;
  border-radius: 0.25rem;
}
</style>
