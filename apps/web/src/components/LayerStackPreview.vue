<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, type Ref } from 'vue'
import type { ColorBasedLayerMap } from '../modules/Segmentation/Domain'

const props = defineProps<{
  colorLayerMap: ColorBasedLayerMap | null
  originalImageData: ImageData | null
}>()

// 3D view controls
const rotateX = ref(10)
const rotateY = ref(20)
const layerSpacing = ref(50)

// Layers are already sorted by area in the service
const layers = computed(() => {
  if (!props.colorLayerMap) return []
  return props.colorLayerMap.layers
})

// Generate layer canvases
const layerCanvases: Ref<HTMLCanvasElement[]> = ref([])

const renderLayers = async () => {
  if (!props.colorLayerMap || !props.originalImageData) return

  // Wait for canvas elements to be mounted in DOM
  await nextTick()

  // Wait until all canvas refs are populated
  const expectedCount = layers.value.length
  let retries = 0
  while (layerCanvases.value.filter(Boolean).length < expectedCount && retries < 10) {
    await nextTick()
    retries++
  }

  const { labels, width, height } = props.colorLayerMap
  const { data: srcData } = props.originalImageData

  layers.value.forEach((layer, layerIndex) => {
    const canvas = layerCanvases.value[layerIndex]
    if (!canvas) return

    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imageData = new ImageData(width, height)
    const { data } = imageData

    // Copy only pixels belonging to this color cluster
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] === layer.id) {
        const idx = i * 4
        data[idx] = srcData[idx]!
        data[idx + 1] = srcData[idx + 1]!
        data[idx + 2] = srcData[idx + 2]!
        data[idx + 3] = 255
      }
    }

    ctx.putImageData(imageData, 0, 0)
  })
}

// Render on mount (for initial display)
onMounted(renderLayers)

// Re-render when data changes
watch([() => props.colorLayerMap, () => props.originalImageData, layers], renderLayers, { deep: true })

// Image dimensions for centering
const imageSize = computed(() => {
  if (!props.colorLayerMap) return { width: 400, height: 300 }
  const { width, height } = props.colorLayerMap
  // Scale to fit ~90% of container (max 650px width)
  const maxWidth = 650
  const scale = Math.min(maxWidth / width, maxWidth / height * 0.9)
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  }
})

// Total stack depth for centering
const stackDepth = computed(() => layers.value.length * layerSpacing.value)

const containerStyle = computed(() => ({
  perspective: '1500px',
  perspectiveOrigin: '50% 50%',
}))

const sceneStyle = computed(() => ({
  // Center the rotation around the middle of the stack
  transform: `rotateX(${rotateX.value}deg) rotateY(${rotateY.value}deg) translateZ(${-stackDepth.value / 2}px)`,
  transformStyle: 'preserve-3d' as const,
}))

const getLayerStyle = (index: number) => ({
  width: `${imageSize.value.width}px`,
  height: `${imageSize.value.height}px`,
  transform: `translateX(${-imageSize.value.width / 2}px) translateY(${-imageSize.value.height / 2}px) translateZ(${index * layerSpacing.value}px)`,
  transformStyle: 'preserve-3d' as const,
})

const getGlassStyle = (index: number) => ({
  width: `${imageSize.value.width + 10}px`,
  height: `${imageSize.value.height + 10}px`,
  transform: `translateX(${-imageSize.value.width / 2 - 5}px) translateY(${-imageSize.value.height / 2 - 5}px) translateZ(${index * layerSpacing.value - 2}px)`,
  transformStyle: 'preserve-3d' as const,
})

// Drag to rotate
const isDragging = ref(false)
const lastMouse = ref({ x: 0, y: 0 })

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true
  lastMouse.value = { x: e.clientX, y: e.clientY }
}

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return
  const dx = e.clientX - lastMouse.value.x
  const dy = e.clientY - lastMouse.value.y
  rotateY.value = Math.max(-80, Math.min(80, rotateY.value + dx * 0.5))
  rotateX.value = Math.max(-80, Math.min(80, rotateX.value - dy * 0.5))
  lastMouse.value = { x: e.clientX, y: e.clientY }
}

const handleMouseUp = () => {
  isDragging.value = false
}

const handleDoubleClick = () => {
  rotateX.value = 0
  rotateY.value = 0
}
</script>

<template>
  <div>

    <!-- 3D Preview -->
    <div
      :style="containerStyle"
      class="relative w-full bg-gray-950 rounded-lg overflow-hidden cursor-move"
      style="aspect-ratio: 4/3; min-height: 400px;"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
      @dblclick="handleDoubleClick"
    >
      <div class="absolute inset-0 flex items-center justify-center">
        <div
          :style="sceneStyle"
          class="relative transition-transform duration-75"
          :class="{ 'transition-none': isDragging }"
        >
          <!-- Layer stack with glass plates -->
          <template v-for="(layer, index) in layers" :key="layer.id">
            <!-- Glass plate -->
            <div
              :style="getGlassStyle(index)"
              class="absolute rounded"
              style="background: linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%); border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 16px rgba(0,0,0,0.1);"
            />
            <!-- Segment content -->
            <canvas
              :ref="(el) => { if (el) layerCanvases[index] = el as HTMLCanvasElement }"
              :style="getLayerStyle(index)"
              class="absolute object-contain backface-hidden"
            />
          </template>
        </div>
      </div>

      <!-- Help text -->
      <div class="absolute bottom-2 left-2 text-[10px] text-gray-600">
        Drag to rotate
      </div>
    </div>
  </div>
</template>
