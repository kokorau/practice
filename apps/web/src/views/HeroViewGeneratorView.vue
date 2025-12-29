<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { TextureRenderer } from '@practice/texture'

type RGBA = [number, number, number, number]

// 共通カラー
const color1: RGBA = [0.29, 0.44, 0.65, 1.0]
const color2: RGBA = [0.2, 0.3, 0.5, 1.0]

interface TexturePreview {
  label: string
  canvasRef: ReturnType<typeof ref<HTMLCanvasElement | null>>
  renderer: TextureRenderer | null
  render: (r: TextureRenderer, c1: RGBA, c2: RGBA) => void
}

const patterns: Omit<TexturePreview, 'canvasRef' | 'renderer'>[] = [
  {
    label: 'Solid',
    render: (r, c1) => r.renderSolid({ color: c1 }),
  },
  {
    label: 'Diagonal 45°',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 20, width2: 20, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
  {
    label: 'Horizontal',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 15, width2: 15, angle: 0, color1: c1, color2: c2 }),
  },
  {
    label: 'Vertical',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 10, width2: 10, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
  {
    label: 'Thin Diagonal',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 4, width2: 4, angle: Math.PI / 4, color1: c1, color2: c2 }),
  },
  {
    label: 'Wide Bands',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 40, width2: 20, angle: -Math.PI / 6, color1: c1, color2: c2 }),
  },
  {
    label: 'Pinstripe',
    render: (r, c1, c2) =>
      r.renderStripe({ width1: 2, width2: 12, angle: Math.PI / 2, color1: c1, color2: c2 }),
  },
]

const previews: TexturePreview[] = patterns.map((p) => ({
  ...p,
  canvasRef: ref<HTMLCanvasElement | null>(null),
  renderer: null,
}))

onMounted(async () => {
  for (const preview of previews) {
    const canvas = preview.canvasRef.value
    if (canvas) {
      canvas.width = 400
      canvas.height = 225
      try {
        preview.renderer = await TextureRenderer.create(canvas)
        preview.render(preview.renderer, color1, color2)
      } catch (e) {
        console.error('WebGPU not available:', e)
      }
    }
  }
})

onUnmounted(() => {
  for (const preview of previews) {
    preview.renderer?.destroy()
  }
})
</script>

<template>
  <div class="w-screen min-h-screen bg-gray-900 text-white p-8">
    <div class="max-w-7xl mx-auto">
      <h1 class="text-3xl font-bold mb-8">Hero View Generator</h1>
      <div class="grid grid-cols-3 gap-4">
        <div v-for="(preview, i) in previews" :key="i">
          <p class="text-sm text-gray-400 mb-2">{{ preview.label }}</p>
          <div class="w-full aspect-video rounded-lg overflow-hidden border border-gray-700">
            <canvas :ref="(el) => (preview.canvasRef.value = el as HTMLCanvasElement)" class="w-full h-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
