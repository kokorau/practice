<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { TextureRenderer, type TextureRenderSpec } from '@practice/texture'

const props = defineProps<{
  label?: string
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
  <div class="node-preview">
    <div class="node-label">
      <slot name="label">{{ label }}</slot>
    </div>
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="node-canvas"
    />
  </div>
</template>

<style scoped>
.node-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
}

.node-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.node-canvas {
  border-radius: 0.25rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
</style>
