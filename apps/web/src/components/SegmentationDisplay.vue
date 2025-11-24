<script setup lang="ts">
import { ref, watch, computed, type Ref } from 'vue'

const props = defineProps<{
  segmentVisualization: ImageData | null
  edgeVisualization: ImageData | null
  overlayVisualization: ImageData | null
  segmentCount: number
  edgeThreshold: number
}>()

const emit = defineEmits<{
  'update:edgeThreshold': [value: number]
}>()

type ViewMode = 'segments' | 'edges' | 'overlay'
const viewMode = ref<ViewMode>('overlay')

const canvasRef: Ref<HTMLCanvasElement | null> = ref(null)

const currentVisualization = computed(() => {
  switch (viewMode.value) {
    case 'segments': return props.segmentVisualization
    case 'edges': return props.edgeVisualization
    case 'overlay': return props.overlayVisualization
    default: return null
  }
})

const render = () => {
  const canvas = canvasRef.value
  const data = currentVisualization.value
  if (!canvas || !data) return

  canvas.width = data.width
  canvas.height = data.height

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  ctx.putImageData(data, 0, 0)
}

watch(currentVisualization, render)
watch(canvasRef, render)

const handleThresholdChange = (e: Event) => {
  const value = parseInt((e.target as HTMLInputElement).value)
  emit('update:edgeThreshold', value)
}
</script>

<template>
  <div class="space-y-3">
    <!-- View mode toggle -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 w-12">View</span>
      <div class="flex gap-1">
        <button
          v-for="mode in (['overlay', 'segments', 'edges'] as const)"
          :key="mode"
          @click="viewMode = mode"
          :class="[
            'px-2 py-0.5 text-[10px] rounded transition-colors',
            viewMode === mode
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          ]"
        >
          {{ mode }}
        </button>
      </div>
      <span class="text-[10px] text-gray-500 ml-auto">
        {{ segmentCount }} segments
      </span>
    </div>

    <!-- Edge threshold slider -->
    <div class="flex items-center gap-2">
      <span class="text-xs text-gray-500 w-12">Edge</span>
      <input
        type="range"
        min="10"
        max="100"
        :value="edgeThreshold"
        @input="handleThresholdChange"
        class="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer"
      />
      <span class="text-[10px] text-gray-500 w-8 text-right">{{ edgeThreshold }}</span>
    </div>

    <!-- Canvas -->
    <div class="relative w-full bg-gray-900 rounded overflow-hidden" style="aspect-ratio: 16/9;">
      <canvas
        ref="canvasRef"
        class="absolute inset-0 w-full h-full object-contain"
      />
      <div
        v-if="!currentVisualization"
        class="absolute inset-0 flex items-center justify-center text-gray-500 text-xs"
      >
        No image
      </div>
    </div>
  </div>
</template>
