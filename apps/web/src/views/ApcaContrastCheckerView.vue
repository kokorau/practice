<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMedia } from '../composables/Media'
import { $Media } from '../modules/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import ScaledCanvas from '../components/ScaledCanvas.vue'
import { $APCA, $Srgb } from '@practice/color'
import {
  type LuminanceMap,
  type ContrastHistogram,
  $LuminanceMapGenerator,
  $ContrastAnalyzer,
  $ContrastScore,
} from '../modules/ContrastChecker'

// Node types
type NodeType = 'canvas' | 'text' | 'value' | 'histogram' | 'score'
type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

interface NodeDefinition {
  id: string           // UUID for connections
  label: string        // Display label (A, B, C...)
  title: string        // Node title
  type: NodeType
  row: number          // Row position for layout
}

interface Connection {
  from: { nodeId: string; position: EdgePosition }
  to: { nodeId: string; position: EdgePosition }
}

// Node definitions
const NODE_SOURCE = 'source-image'
const NODE_TEXT = 'text-layer'
const NODE_COMPOSITE = 'composite-preview'
const NODE_LUMINANCE = 'luminance-map'
const NODE_REGION = 'text-region'
const NODE_TEXT_Y = 'text-color-y'
const NODE_APCA_SCORE = 'apca-score-map'
const NODE_HISTOGRAM = 'histogram'
const NODE_FINAL_SCORE = 'final-score'

const nodeDefinitions = ref<NodeDefinition[]>([
  { id: NODE_SOURCE, label: 'A', title: 'Source', type: 'canvas', row: 1 },
  { id: NODE_TEXT, label: 'B', title: 'Text', type: 'text', row: 1 },
  { id: NODE_COMPOSITE, label: 'I', title: 'Composite', type: 'canvas', row: 1 },
  { id: NODE_LUMINANCE, label: 'C', title: 'Luminance', type: 'canvas', row: 2 },
  { id: NODE_REGION, label: 'D', title: 'Region', type: 'canvas', row: 2 },
  { id: NODE_TEXT_Y, label: 'E', title: 'Text Y', type: 'value', row: 2 },
  { id: NODE_APCA_SCORE, label: 'F', title: 'APCA Score', type: 'canvas', row: 3 },
  { id: NODE_HISTOGRAM, label: 'G', title: 'Distribution', type: 'histogram', row: 4 },
  { id: NODE_FINAL_SCORE, label: 'H', title: 'Score', type: 'score', row: 5 },
])

const connectionDefinitions = ref<Connection[]>([
  { from: { nodeId: NODE_SOURCE, position: 'bottom' }, to: { nodeId: NODE_LUMINANCE, position: 'top' } },
  { from: { nodeId: NODE_LUMINANCE, position: 'right' }, to: { nodeId: NODE_REGION, position: 'left' } },
  { from: { nodeId: NODE_TEXT, position: 'bottom' }, to: { nodeId: NODE_REGION, position: 'top' } },
  { from: { nodeId: NODE_TEXT, position: 'bottom' }, to: { nodeId: NODE_TEXT_Y, position: 'top' } },
  { from: { nodeId: NODE_REGION, position: 'bottom' }, to: { nodeId: NODE_APCA_SCORE, position: 'top' } },
  { from: { nodeId: NODE_TEXT_Y, position: 'bottom' }, to: { nodeId: NODE_APCA_SCORE, position: 'top' } },
  { from: { nodeId: NODE_APCA_SCORE, position: 'bottom' }, to: { nodeId: NODE_HISTOGRAM, position: 'top' } },
  { from: { nodeId: NODE_HISTOGRAM, position: 'bottom' }, to: { nodeId: NODE_FINAL_SCORE, position: 'top' } },
])

// Get node label/title by ID
function getNodeLabel(id: string): string {
  return nodeDefinitions.value.find(n => n.id === id)?.label ?? ''
}

function getNodeTitle(id: string): string {
  return nodeDefinitions.value.find(n => n.id === id)?.title ?? ''
}

// Node sizes (like GradientLabView)
const NODE_WIDTH = 200
const NODE_HEIGHT = 112

// Internal canvas size
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Node refs for connection lines (Map by node ID)
const nodeGraphRef = ref<HTMLElement | null>(null)
const nodeRefs = ref<Map<string, HTMLElement | null>>(new Map())

// Set node ref helper
function setNodeRef(nodeId: string, el: HTMLElement | null) {
  nodeRefs.value.set(nodeId, el)
}

// Canvas refs (individual refs for reliability)
const canvasSourceRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const canvasCompositeRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const canvasLuminanceRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const canvasRegionRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const canvasApcaScoreRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)

// Get canvas by node ID
function getCanvas(nodeId: string): HTMLCanvasElement | null {
  switch (nodeId) {
    case NODE_SOURCE: return canvasSourceRef.value?.canvas ?? null
    case NODE_COMPOSITE: return canvasCompositeRef.value?.canvas ?? null
    case NODE_LUMINANCE: return canvasLuminanceRef.value?.canvas ?? null
    case NODE_REGION: return canvasRegionRef.value?.canvas ?? null
    case NODE_APCA_SCORE: return canvasApcaScoreRef.value?.canvas ?? null
    default: return null
  }
}

// Luminance map (for reuse in score calculation)
const luminanceMap = ref<LuminanceMap | null>(null)

// Node G: Histogram data
const histogramData = ref<ContrastHistogram>($ContrastScore.createEmptyHistogram())

// Node H: Score calculation
const scoreThreshold = ref(2) // percentage threshold
const calculatedScore = computed(() => {
  return $ContrastScore.calculateMinimumScore(histogramData.value, scoreThreshold.value)
})

// Connection paths
const connectionPaths = ref<string[]>([])

// Node B: Text Layer
const textContent = ref('Hello World')
const textColor = ref('#ffffff')
type VerticalAlign = 'top' | 'center' | 'bottom'
type HorizontalAlign = 'left' | 'center' | 'right'
const verticalAlign = ref<VerticalAlign>('center')
const horizontalAlign = ref<HorizontalAlign>('center')

// Node E: Text Color APCA Y value
const textColorY = computed(() => {
  const srgb = $Srgb.fromHex(textColor.value)
  return srgb ? $APCA.srgbToY(srgb) : 0
})

// Text bounding box calculation
const textBounds = ref<{ x: number; y: number; width: number; height: number } | null>(null)
const textMeasureRef = ref<HTMLSpanElement | null>(null)

function updateTextBounds() {
  if (!textMeasureRef.value) return

  const span = textMeasureRef.value
  const textWidth = span.offsetWidth
  const textHeight = span.offsetHeight

  const padding = 32
  const areaWidth = CANVAS_WIDTH - padding * 2
  const areaHeight = CANVAS_HEIGHT - padding * 2

  let x = padding
  let y = padding

  // Horizontal alignment
  if (horizontalAlign.value === 'center') {
    x = padding + (areaWidth - textWidth) / 2
  } else if (horizontalAlign.value === 'right') {
    x = padding + areaWidth - textWidth
  }

  // Vertical alignment
  if (verticalAlign.value === 'center') {
    y = padding + (areaHeight - textHeight) / 2
  } else if (verticalAlign.value === 'bottom') {
    y = padding + areaHeight - textHeight
  }

  textBounds.value = { x, y, width: textWidth, height: textHeight }
}

// Get node edge position
function getNodeEdge(nodeRef: HTMLElement | null, container: HTMLElement | null, position: 'top' | 'bottom' | 'left' | 'right') {
  if (!nodeRef || !container) return { x: 0, y: 0 }
  const nodeRect = nodeRef.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const left = nodeRect.left - containerRect.left
  const top = nodeRect.top - containerRect.top
  const centerX = left + nodeRect.width / 2
  const centerY = top + nodeRect.height / 2

  switch (position) {
    case 'top': return { x: centerX, y: top }
    case 'bottom': return { x: centerX, y: top + nodeRect.height }
    case 'left': return { x: left, y: centerY }
    case 'right': return { x: left + nodeRect.width, y: centerY }
  }
}

// Create bezier path (vertical)
function createBezierPathV(from: { x: number, y: number }, to: { x: number, y: number }) {
  const midY = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
}

// Create bezier path (horizontal)
function createBezierPathH(from: { x: number, y: number }, to: { x: number, y: number }) {
  const midX = (from.x + to.x) / 2
  return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
}

// Update connection lines (UUID-based)
function updateConnections() {
  if (!nodeGraphRef.value) return

  const container = nodeGraphRef.value
  const paths: string[] = []

  for (const conn of connectionDefinitions.value) {
    const fromNode = nodeRefs.value.get(conn.from.nodeId)
    const toNode = nodeRefs.value.get(conn.to.nodeId)

    const fromPos = getNodeEdge(fromNode ?? null, container, conn.from.position)
    const toPos = getNodeEdge(toNode ?? null, container, conn.to.position)

    // Use horizontal path for left/right connections, vertical for top/bottom
    const isHorizontal = conn.from.position === 'left' || conn.from.position === 'right'
    const path = isHorizontal
      ? createBezierPathH(fromPos, toPos)
      : createBezierPathV(fromPos, toPos)

    paths.push(path)
  }

  connectionPaths.value = paths
}

// object-fit: cover calculation
function calcCoverRect(srcW: number, srcH: number, dstW: number, dstH: number) {
  const srcAspect = srcW / srcH
  const dstAspect = dstW / dstH

  let sx: number, sy: number, sw: number, sh: number

  if (srcAspect > dstAspect) {
    sh = srcH
    sw = srcH * dstAspect
    sx = (srcW - sw) / 2
    sy = 0
  } else {
    sw = srcW
    sh = srcW / dstAspect
    sx = 0
    sy = (srcH - sh) / 2
  }

  return { sx, sy, sw, sh }
}

// Node: Source Image (renders to both Source and Composite canvases)
function renderSourceImage() {
  if (!media.value) return

  const sourceImageData = $Media.getImageData(media.value)
  if (!sourceImageData) return

  const offscreen = new OffscreenCanvas(sourceImageData.width, sourceImageData.height)
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return
  offCtx.putImageData(sourceImageData, 0, 0)

  const { sx, sy, sw, sh } = calcCoverRect(
    sourceImageData.width, sourceImageData.height,
    CANVAS_WIDTH, CANVAS_HEIGHT
  )

  // Render to both Source and Composite canvases
  for (const nodeId of [NODE_SOURCE, NODE_COMPOSITE]) {
    const canvas = getCanvas(nodeId)
    if (!canvas) continue

    const ctx = canvas.getContext('2d')
    if (!ctx) continue

    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    ctx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }
}

// Node: Luminance Map
function renderLuminanceMap() {
  const canvas = getCanvas(NODE_LUMINANCE)
  if (!media.value || !canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const sourceImageData = $Media.getImageData(media.value)
  if (!sourceImageData) return

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const { sx, sy, sw, sh } = calcCoverRect(
    sourceImageData.width, sourceImageData.height,
    CANVAS_WIDTH, CANVAS_HEIGHT
  )

  // Resample source image to canvas size
  const croppedImageData = new ImageData(CANVAS_WIDTH, CANVAS_HEIGHT)
  const srcData = sourceImageData.data
  const dstData = croppedImageData.data
  const srcW = sourceImageData.width

  for (let dy = 0; dy < CANVAS_HEIGHT; dy++) {
    for (let dx = 0; dx < CANVAS_WIDTH; dx++) {
      const srcX = Math.floor(sx + (dx / CANVAS_WIDTH) * sw)
      const srcY = Math.floor(sy + (dy / CANVAS_HEIGHT) * sh)
      const srcIdx = (srcY * srcW + srcX) * 4
      const dstIdx = (dy * CANVAS_WIDTH + dx) * 4

      dstData[dstIdx] = srcData[srcIdx]!
      dstData[dstIdx + 1] = srcData[srcIdx + 1]!
      dstData[dstIdx + 2] = srcData[srcIdx + 2]!
      dstData[dstIdx + 3] = srcData[srcIdx + 3]!
    }
  }

  // Generate luminance map using ContrastChecker module
  luminanceMap.value = $LuminanceMapGenerator.fromImageData(croppedImageData)

  // Convert to grayscale ImageData for display
  const luminanceImageData = $LuminanceMapGenerator.toImageData(luminanceMap.value)
  ctx.putImageData(luminanceImageData, 0, 0)
}

// Node: Extract text region from luminance map
function renderTextRegion() {
  const srcCanvas = getCanvas(NODE_LUMINANCE)
  const dstCanvas = getCanvas(NODE_REGION)
  if (!srcCanvas || !dstCanvas || !textBounds.value) return

  const ctx = dstCanvas.getContext('2d')
  if (!ctx) return

  const bounds = textBounds.value
  dstCanvas.width = NODE_WIDTH
  dstCanvas.height = NODE_HEIGHT

  // Clear with transparent background (don't fill with color)
  ctx.clearRect(0, 0, NODE_WIDTH, NODE_HEIGHT)

  // Scale factor from canvas coords to node preview
  const scaleX = NODE_WIDTH / CANVAS_WIDTH
  const scaleY = NODE_HEIGHT / CANVAS_HEIGHT

  // Source region (in canvas coordinates)
  const sx = bounds.x
  const sy = bounds.y
  const sw = bounds.width
  const sh = bounds.height

  // Destination (centered in node preview)
  const dw = sw * scaleX
  const dh = sh * scaleY
  const dx = (NODE_WIDTH - dw) / 2
  const dy = (NODE_HEIGHT - dh) / 2

  ctx.drawImage(srcCanvas, sx, sy, sw, sh, dx, dy, dw, dh)
}

// Node: APCA Score Map (uses $ContrastAnalyzer.generateScoreMap)
function renderApcaScoreMap() {
  const dstCanvas = getCanvas(NODE_APCA_SCORE)
  if (!dstCanvas || !luminanceMap.value || !textBounds.value) return

  const ctx = dstCanvas.getContext('2d')
  if (!ctx) return

  dstCanvas.width = NODE_WIDTH
  dstCanvas.height = NODE_HEIGHT

  // Clear canvas
  ctx.clearRect(0, 0, NODE_WIDTH, NODE_HEIGHT)

  const bounds = textBounds.value
  const textY = textColorY.value

  // Generate score map for the text region
  const scoreImageData = $ContrastAnalyzer.generateScoreMap(
    luminanceMap.value,
    textY,
    { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  )

  // Scale and center in node preview
  const scaleX = NODE_WIDTH / CANVAS_WIDTH
  const scaleY = NODE_HEIGHT / CANVAS_HEIGHT
  const dw = bounds.width * scaleX
  const dh = bounds.height * scaleY
  const dx = (NODE_WIDTH - dw) / 2
  const dy = (NODE_HEIGHT - dh) / 2

  // Draw score map scaled to preview size
  const tempCanvas = new OffscreenCanvas(scoreImageData.width, scoreImageData.height)
  const tempCtx = tempCanvas.getContext('2d')
  if (tempCtx) {
    tempCtx.putImageData(scoreImageData, 0, 0)
    ctx.drawImage(tempCanvas, 0, 0, scoreImageData.width, scoreImageData.height, dx, dy, dw, dh)
  }
}

// Node: Calculate histogram (uses $ContrastAnalyzer.analyze)
function calculateHistogram() {
  if (!luminanceMap.value || !textBounds.value) {
    histogramData.value = $ContrastScore.createEmptyHistogram()
    return
  }

  const bounds = textBounds.value
  const textY = textColorY.value

  // Analyze contrast for the text region
  const result = $ContrastAnalyzer.analyze(
    luminanceMap.value,
    textY,
    { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
  )

  histogramData.value = result.histogram
}

// Watch for media changes
watch(media, async () => {
  await nextTick()
  renderSourceImage()
  renderLuminanceMap()
  renderTextRegion()
  renderApcaScoreMap()
  calculateHistogram()
})

// Watch for text changes
watch([textContent, verticalAlign, horizontalAlign, textMeasureRef], async () => {
  await nextTick()
  updateTextBounds()
  renderTextRegion()
  renderApcaScoreMap()
  calculateHistogram()
})

// Watch for text color changes
watch(textColor, async () => {
  await nextTick()
  renderApcaScoreMap()
  calculateHistogram()
})

// Unsplash
const isLoadingUnsplash = ref(false)
const handleLoadUnsplash = async () => {
  isLoadingUnsplash.value = true
  try {
    await loadUnsplashPhoto()
    const loadedPhoto = photoRepository.get()
    if (loadedPhoto) {
      setPhoto(loadedPhoto)
    }
  } finally {
    isLoadingUnsplash.value = false
  }
}

// File input handler
const handleFileChange = async (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    await loadPhoto(file)
  }
}

// Initialize
onMounted(async () => {
  const existingPhoto = photoRepository.get()
  if (existingPhoto && !media.value) {
    setPhoto(existingPhoto)
  } else if (!media.value) {
    const defaultPhoto = createDefaultPhotoUseCase()
    photoRepository.set(defaultPhoto)
    setPhoto(defaultPhoto)
  }

  await nextTick()
  setTimeout(() => {
    updateConnections()
    updateTextBounds()
    renderSourceImage()
    renderLuminanceMap()
    renderTextRegion()
    renderApcaScoreMap()
    calculateHistogram()
  }, 100)
  window.addEventListener('resize', updateConnections)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateConnections)
})
</script>

<template>
  <div class="h-screen bg-gray-950 text-white flex justify-center">
    <div class="flex w-[1400px] max-w-full">
      <!-- Left Panel: Controls -->
      <div class="w-64 flex-shrink-0 bg-gray-900 flex flex-col">
        <div class="p-3">
          <p class="text-xl font-bold text-gray-400">APCA Contrast</p>
        </div>

        <div class="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
          <!-- Image Source -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Source</h2>
            <div class="space-y-2">
              <button
                @click="handleLoadUnsplash"
                :disabled="isLoadingUnsplash"
                class="w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-300 hover:bg-gray-700 disabled:opacity-50 transition-colors"
              >
                {{ isLoadingUnsplash ? 'Loading...' : 'Random Photo' }}
              </button>
              <label class="block w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-400 hover:bg-gray-700 cursor-pointer text-center transition-colors">
                Choose File
                <input type="file" accept="image/*" @change="handleFileChange" class="hidden" />
              </label>
            </div>
          </section>

          <!-- Text Layer -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Text Layer</h2>
            <div class="space-y-3">
              <input
                v-model="textContent"
                type="text"
                placeholder="Enter text..."
                class="w-full py-1.5 px-3 rounded text-xs bg-gray-800 text-gray-300 border border-gray-700 focus:border-gray-500 focus:outline-none"
              />

              <div class="flex items-center gap-2">
                <input
                  v-model="textColor"
                  type="color"
                  class="w-8 h-8 rounded border-0 cursor-pointer"
                />
                <span class="text-xs text-gray-400">{{ textColor }}</span>
              </div>

              <div class="position-grid">
                <button
                  v-for="pos in [
                    { v: 'top', h: 'left' },
                    { v: 'top', h: 'center' },
                    { v: 'top', h: 'right' },
                    { v: 'center', h: 'left' },
                    { v: 'center', h: 'center' },
                    { v: 'center', h: 'right' },
                    { v: 'bottom', h: 'left' },
                    { v: 'bottom', h: 'center' },
                    { v: 'bottom', h: 'right' },
                  ]"
                  :key="`${pos.v}-${pos.h}`"
                  @click="verticalAlign = pos.v as VerticalAlign; horizontalAlign = pos.h as HorizontalAlign"
                  class="position-grid-cell"
                  :class="verticalAlign === pos.v && horizontalAlign === pos.h ? 'active' : ''"
                >
                </button>
              </div>
            </div>
          </section>

          <!-- Score Settings -->
          <section>
            <h2 class="text-[11px] text-gray-500 uppercase tracking-wider mb-2">Score</h2>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-gray-400">Threshold</span>
                <span class="text-xs text-gray-300">{{ scoreThreshold }}%</span>
              </div>
              <input
                v-model.number="scoreThreshold"
                type="range"
                min="1"
                max="5"
                step="0.5"
                class="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider-thumb"
              />
            </div>
          </section>

          <p v-if="mediaError" class="text-xs text-red-400">{{ mediaError }}</p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col min-w-0 p-6 overflow-auto">
        <section ref="nodeGraphRef" class="node-graph">
          <!-- SVG Connection Lines -->
          <svg class="connections-overlay">
            <path
              v-for="(path, index) in connectionPaths"
              :key="index"
              :d="path"
              class="connection-line"
            />
          </svg>

          <!-- Row 1: Source, Text (中央寄せ) -->
          <div :ref="(el) => setNodeRef(NODE_SOURCE, el as HTMLElement)" class="node-wrapper" style="grid-column: 2 / span 2; grid-row: 1;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_SOURCE) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_SOURCE) }}</span>
            </div>
            <div class="node-preview">
              <ScaledCanvas
                ref="canvasSourceRef"
                :canvas-width="CANVAS_WIDTH"
                :canvas-height="CANVAS_HEIGHT"
                :class="{ 'opacity-0': !media }"
              />
              <p v-if="!media" class="node-empty">No image</p>
            </div>
          </div>

          <div :ref="(el) => setNodeRef(NODE_TEXT, el as HTMLElement)" class="node-wrapper" style="grid-column: 5 / span 2; grid-row: 1;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_TEXT) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_TEXT) }}</span>
            </div>
            <div class="node-preview">
              <div
                class="text-layer"
                :class="[`align-v-${verticalAlign}`, `align-h-${horizontalAlign}`]"
              >
                <span ref="textMeasureRef" class="text-layer-title" :style="{ color: textColor }">{{ textContent }}</span>
              </div>
            </div>
          </div>

          <div :ref="(el) => setNodeRef(NODE_COMPOSITE, el as HTMLElement)" class="node-wrapper" style="grid-column: 3 / span 2; grid-row: 5;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_COMPOSITE) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_COMPOSITE) }}</span>
            </div>
            <div class="node-preview node-preview-composite">
              <ScaledCanvas
                ref="canvasCompositeRef"
                :canvas-width="CANVAS_WIDTH"
                :canvas-height="CANVAS_HEIGHT"
                :class="{ 'opacity-0': !media }"
              />
              <div
                class="text-layer text-layer-overlay"
                :class="[`align-v-${verticalAlign}`, `align-h-${horizontalAlign}`]"
              >
                <span class="text-layer-title" :style="{ color: textColor }">{{ textContent }}</span>
              </div>
              <p v-if="!media" class="node-empty">No image</p>
            </div>
          </div>

          <!-- Row 2: Luminance, Region, Text Y (中央寄せ) -->
          <div :ref="(el) => setNodeRef(NODE_LUMINANCE, el as HTMLElement)" class="node-wrapper" style="grid-column: 2 / span 2; grid-row: 2;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_LUMINANCE) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_LUMINANCE) }}</span>
            </div>
            <div class="node-preview">
              <ScaledCanvas
                ref="canvasLuminanceRef"
                :canvas-width="CANVAS_WIDTH"
                :canvas-height="CANVAS_HEIGHT"
                :class="{ 'opacity-0': !media }"
              />
              <p v-if="!media" class="node-empty">No image</p>
            </div>
          </div>

          <div :ref="(el) => setNodeRef(NODE_REGION, el as HTMLElement)" class="node-wrapper" style="grid-column: 4 / span 2; grid-row: 2;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_REGION) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_REGION) }}</span>
            </div>
            <div class="node-preview">
              <ScaledCanvas
                ref="canvasRegionRef"
                :canvas-width="NODE_WIDTH"
                :canvas-height="NODE_HEIGHT"
                :class="{ 'opacity-0': !textBounds }"
              />
              <p v-if="!textBounds" class="node-empty">No text</p>
            </div>
          </div>

          <div :ref="(el) => setNodeRef(NODE_TEXT_Y, el as HTMLElement)" class="node-wrapper" style="grid-column: 6 / span 2; grid-row: 2;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_TEXT_Y) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_TEXT_Y) }}</span>
            </div>
            <div class="node-preview node-preview-center">
              <div class="value-display">
                <div class="value-color" :style="{ backgroundColor: textColor }"></div>
                <span class="value-number">{{ textColorY.toFixed(4) }}</span>
              </div>
            </div>
          </div>

          <!-- Row 3: APCA Score -->
          <div :ref="(el) => setNodeRef(NODE_APCA_SCORE, el as HTMLElement)" class="node-wrapper" style="grid-column: 5 / span 2; grid-row: 3;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_APCA_SCORE) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_APCA_SCORE) }}</span>
            </div>
            <div class="node-preview">
              <ScaledCanvas
                ref="canvasApcaScoreRef"
                :canvas-width="NODE_WIDTH"
                :canvas-height="NODE_HEIGHT"
                :class="{ 'opacity-0': !textBounds }"
              />
              <p v-if="!textBounds" class="node-empty">No data</p>
            </div>
          </div>

          <!-- Row 4: Histogram -->
          <div :ref="(el) => setNodeRef(NODE_HISTOGRAM, el as HTMLElement)" class="node-wrapper" style="grid-column: 5 / span 2; grid-row: 4;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_HISTOGRAM) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_HISTOGRAM) }}</span>
            </div>
            <div class="node-preview node-preview-histogram">
              <div class="histogram">
                <div
                  v-for="(value, index) in histogramData.bins"
                  :key="index"
                  class="histogram-bar-container"
                >
                  <div
                    class="histogram-bar"
                    :style="{ height: `${value}%` }"
                    :class="{ 'histogram-bar-threshold': value >= scoreThreshold }"
                  ></div>
                  <span class="histogram-label">{{ index * 10 }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 5: Final Score -->
          <div :ref="(el) => setNodeRef(NODE_FINAL_SCORE, el as HTMLElement)" class="node-wrapper" style="grid-column: 5 / span 2; grid-row: 5;">
            <div class="node-title">
              <span class="node-badge">{{ getNodeLabel(NODE_FINAL_SCORE) }}</span>
              <span class="node-title-text">{{ getNodeTitle(NODE_FINAL_SCORE) }}</span>
            </div>
            <div class="node-preview node-preview-center">
              <div class="score-display">
                <span class="score-number">{{ calculatedScore }}</span>
                <span class="score-label">APCA Lc</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.node-graph {
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3rem;
}

.connections-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.connection-line {
  fill: none;
  stroke: #4ecdc4;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.5;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  position: relative;
  z-index: 1;
}

.node-title {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.node-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  background: #4ecdc4;
  color: #1a1a2e;
  font-size: 0.625rem;
  font-weight: 700;
  border-radius: 0.25rem;
}

.node-title-text {
  font-size: 0.75rem;
  font-weight: 500;
  color: #aaa;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.node-preview {
  position: relative;
  background: #1e1e3a;
  border: 1px solid #3a3a5a;
  border-radius: 0.5rem;
  overflow: hidden;
  width: 200px;
  height: 112px;
}

.node-preview-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.node-empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 0.75rem;
}

/* Position Grid */
.position-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 4px;
}

.position-grid-cell {
  aspect-ratio: 1;
  border-radius: 4px;
  background: #374151;
  border: none;
  cursor: pointer;
  transition: background-color 0.15s;
}

.position-grid-cell:hover {
  background: #4b5563;
}

.position-grid-cell.active {
  background: #0891b2;
}

/* Text Layer */
.text-layer {
  width: 640px;
  height: 360px;
  transform: scale(0.3125);
  transform-origin: top left;
  padding: 32px;
  display: flex;
}

.text-layer.align-v-top { align-items: flex-start; }
.text-layer.align-v-center { align-items: center; }
.text-layer.align-v-bottom { align-items: flex-end; }
.text-layer.align-h-left { justify-content: flex-start; }
.text-layer.align-h-center { justify-content: center; }
.text-layer.align-h-right { justify-content: flex-end; }

.text-layer-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0;
  white-space: nowrap;
}

.text-layer-overlay {
  position: absolute;
  top: 0;
  left: 0;
}

.node-preview-composite {
  position: relative;
}

/* Value Display */
.value-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.value-color {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.value-number {
  font-size: 14px;
  font-weight: 700;
  font-family: monospace;
  color: #fff;
}

/* Histogram */
.node-preview-histogram {
  display: flex;
  align-items: flex-end;
  padding: 8px 4px 16px;
}

.histogram {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  gap: 2px;
}

.histogram-bar-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  position: relative;
}

.histogram-bar {
  width: 100%;
  background: linear-gradient(to top, #4ecdc4, #88d8d0);
  border-radius: 2px 2px 0 0;
  min-height: 1px;
  position: absolute;
  bottom: 12px;
}

.histogram-label {
  position: absolute;
  bottom: 0;
  font-size: 7px;
  color: #888;
  font-family: monospace;
}

.histogram-bar-threshold {
  background: linear-gradient(to top, #f59e0b, #fbbf24);
}

/* Score Display */
.score-display {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.score-number {
  font-size: 36px;
  font-weight: 700;
  font-family: monospace;
  color: #4ecdc4;
}

.score-label {
  font-size: 10px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

/* Slider thumb */
.slider-thumb::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
}

.slider-thumb::-moz-range-thumb {
  width: 12px;
  height: 12px;
  background: #4ecdc4;
  border-radius: 50%;
  cursor: pointer;
  border: none;
}
</style>
