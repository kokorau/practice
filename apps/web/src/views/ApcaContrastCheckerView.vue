<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useMedia } from '../composables/Media'
import { $Media } from '../modules/Media'
import { photoRepository } from '../modules/Photo/Infra/photoRepository'
import { createDefaultPhotoUseCase } from '../modules/Photo/Application/createDefaultPhotoUseCase'
import { loadUnsplashPhoto } from '../modules/PhotoUnsplash/Application/loadUnsplashPhoto'
import ScaledCanvas from '../components/ScaledCanvas.vue'

// Node sizes (like GradientLabView)
const NODE_WIDTH = 200
const NODE_HEIGHT = 112

// Internal canvas size
const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360

// Media
const { media, loadPhoto, setPhoto, error: mediaError } = useMedia()

// Node refs for connection lines
const nodeGraphRef = ref<HTMLElement | null>(null)
const nodeARef = ref<HTMLElement | null>(null)
const nodeBRef = ref<HTMLElement | null>(null)
const nodeCRef = ref<HTMLElement | null>(null)
const nodeDRef = ref<HTMLElement | null>(null)
const nodeERef = ref<HTMLElement | null>(null)
const nodeFRef = ref<HTMLElement | null>(null)
const nodeGRef = ref<HTMLElement | null>(null)
const nodeHRef = ref<HTMLElement | null>(null)

// Canvas refs
const scaledCanvasARef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const scaledCanvasCRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const scaledCanvasDRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)
const scaledCanvasFRef = ref<InstanceType<typeof ScaledCanvas> | null>(null)

// Node G: Histogram data
const histogramData = ref<number[]>(new Array(10).fill(0))

// Node H: Score calculation
const scoreThreshold = ref(2) // percentage threshold
const calculatedScore = computed(() => {
  for (let i = 0; i < histogramData.value.length; i++) {
    if (histogramData.value[i]! >= scoreThreshold.value) {
      return i * 10 // Return lower bound of the range
    }
  }
  return 100 // All ranges below threshold, max score
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
  const hex = textColor.value.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return calcApcaLuminance(r, g, b)
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

// Update connection lines
function updateConnections() {
  if (!nodeGraphRef.value) return

  const container = nodeGraphRef.value

  const aBottom = getNodeEdge(nodeARef.value, container, 'bottom')
  const bBottom = getNodeEdge(nodeBRef.value, container, 'bottom')
  const cTop = getNodeEdge(nodeCRef.value, container, 'top')
  const cRight = getNodeEdge(nodeCRef.value, container, 'right')
  const dLeft = getNodeEdge(nodeDRef.value, container, 'left')
  const dTop = getNodeEdge(nodeDRef.value, container, 'top')
  const dBottom = getNodeEdge(nodeDRef.value, container, 'bottom')
  const eTop = getNodeEdge(nodeERef.value, container, 'top')
  const eBottom = getNodeEdge(nodeERef.value, container, 'bottom')
  const fTop = getNodeEdge(nodeFRef.value, container, 'top')
  const fBottom = getNodeEdge(nodeFRef.value, container, 'bottom')
  const gTop = getNodeEdge(nodeGRef.value, container, 'top')
  const gBottom = getNodeEdge(nodeGRef.value, container, 'bottom')
  const hTop = getNodeEdge(nodeHRef.value, container, 'top')

  connectionPaths.value = [
    createBezierPathV(aBottom, cTop),   // A -> C (vertical)
    createBezierPathH(cRight, dLeft),   // C -> D (horizontal)
    createBezierPathV(bBottom, dTop),   // B -> D (vertical)
    createBezierPathV(bBottom, eTop),   // B -> E (vertical)
    createBezierPathV(dBottom, fTop),   // D -> F (vertical)
    createBezierPathV(eBottom, fTop),   // E -> F (vertical)
    createBezierPathV(fBottom, gTop),   // F -> G (vertical)
    createBezierPathV(gBottom, hTop),   // G -> H (vertical)
  ]
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

// Node A: Source Image
function renderSourceImage() {
  const canvas = scaledCanvasARef.value?.canvas
  if (!media.value || !canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const sourceImageData = $Media.getImageData(media.value)
  if (!sourceImageData) return

  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT

  const offscreen = new OffscreenCanvas(sourceImageData.width, sourceImageData.height)
  const offCtx = offscreen.getContext('2d')
  if (!offCtx) return
  offCtx.putImageData(sourceImageData, 0, 0)

  const { sx, sy, sw, sh } = calcCoverRect(
    sourceImageData.width, sourceImageData.height,
    CANVAS_WIDTH, CANVAS_HEIGHT
  )
  ctx.drawImage(offscreen, sx, sy, sw, sh, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
}

// sRGB to Linear RGB
function sRGBtoLinear(val: number): number {
  return val <= 0.04045
    ? val / 12.92
    : Math.pow((val + 0.055) / 1.055, 2.4)
}

// APCA Luminance (Y)
function calcApcaLuminance(r: number, g: number, b: number): number {
  const rLin = sRGBtoLinear(r / 255)
  const gLin = sRGBtoLinear(g / 255)
  const bLin = sRGBtoLinear(b / 255)
  return 0.2126729 * rLin + 0.7151522 * gLin + 0.0721750 * bLin
}

// Node C: Luminance Map
function renderLuminanceMap() {
  const canvas = scaledCanvasCRef.value?.canvas
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

      const r = srcData[srcIdx]!
      const g = srcData[srcIdx + 1]!
      const b = srcData[srcIdx + 2]!
      const a = srcData[srcIdx + 3]!

      const y = calcApcaLuminance(r, g, b)
      const gray = Math.round(y * 255)

      dstData[dstIdx] = gray
      dstData[dstIdx + 1] = gray
      dstData[dstIdx + 2] = gray
      dstData[dstIdx + 3] = a
    }
  }

  ctx.putImageData(croppedImageData, 0, 0)
}

// Node D: Extract text region from luminance map
function renderTextRegion() {
  const srcCanvas = scaledCanvasCRef.value?.canvas
  const dstCanvas = scaledCanvasDRef.value?.canvas
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

// APCA Contrast calculation
function calcApcaContrast(textY: number, bgY: number): number {
  const Ybg = bgY < 0 ? 0 : bgY
  const Ytxt = textY < 0 ? 0 : textY

  // Soft clamp
  const Rbg = Ybg > 0.022 ? Ybg : Ybg + Math.pow(0.022 - Ybg, 1.414)
  const Rtxt = Ytxt > 0.022 ? Ytxt : Ytxt + Math.pow(0.022 - Ytxt, 1.414)

  // APCA contrast
  let Lc: number
  if (Rbg > Rtxt) {
    // Dark text on light background
    Lc = (Math.pow(Rbg, 0.56) - Math.pow(Rtxt, 0.57)) * 1.14
  } else {
    // Light text on dark background
    Lc = (Math.pow(Rbg, 0.65) - Math.pow(Rtxt, 0.62)) * 1.14
  }

  // Scale and return absolute value
  if (Math.abs(Lc) < 0.1) return 0
  return Lc > 0 ? (Lc - 0.027) * 100 : (Lc + 0.027) * 100
}

// Node F: APCA Score Map
function renderApcaScoreMap() {
  const srcCanvas = scaledCanvasDRef.value?.canvas
  const dstCanvas = scaledCanvasFRef.value?.canvas
  if (!srcCanvas || !dstCanvas) return

  const ctx = dstCanvas.getContext('2d')
  if (!ctx) return

  dstCanvas.width = NODE_WIDTH
  dstCanvas.height = NODE_HEIGHT

  const srcCtx = srcCanvas.getContext('2d')
  if (!srcCtx) return

  const srcImageData = srcCtx.getImageData(0, 0, NODE_WIDTH, NODE_HEIGHT)
  const dstImageData = ctx.createImageData(NODE_WIDTH, NODE_HEIGHT)
  const srcData = srcImageData.data
  const dstData = dstImageData.data

  const textY = textColorY.value

  for (let i = 0; i < srcData.length; i += 4) {
    const alpha = srcData[i + 3]!

    // Skip transparent pixels (outside extracted region)
    if (alpha === 0) {
      dstData[i] = 0
      dstData[i + 1] = 0
      dstData[i + 2] = 0
      dstData[i + 3] = 0
      continue
    }

    // Get background Y from grayscale luminance map
    const bgY = srcData[i]! / 255

    // Calculate APCA score
    const score = calcApcaContrast(textY, bgY)
    const absScore = Math.abs(score)

    // Clamp to 0-100, then normalize to 0-1
    const clamped = Math.min(Math.max(absScore, 0), 100)
    const normalized = clamped / 100
    const gray = Math.round(normalized * 255)

    dstData[i] = gray
    dstData[i + 1] = gray
    dstData[i + 2] = gray
    dstData[i + 3] = alpha
  }

  ctx.putImageData(dstImageData, 0, 0)
}

// Node G: Calculate histogram from APCA score map
function calculateHistogram() {
  const srcCanvas = scaledCanvasFRef.value?.canvas
  if (!srcCanvas) return

  const ctx = srcCanvas.getContext('2d')
  if (!ctx) return

  const imageData = ctx.getImageData(0, 0, NODE_WIDTH, NODE_HEIGHT)
  const data = imageData.data

  // Initialize bins (0-10, 10-20, ..., 90-100)
  const bins = new Array(10).fill(0)
  let totalPixels = 0

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3]!
    if (alpha === 0) continue // Skip transparent pixels

    // Gray value represents score (0-255 maps to 0-100)
    const gray = data[i]!
    const score = (gray / 255) * 100

    // Determine bin index (0-9)
    const binIndex = Math.min(Math.floor(score / 10), 9)
    bins[binIndex]++
    totalPixels++
  }

  // Convert to percentages
  if (totalPixels > 0) {
    histogramData.value = bins.map(count => (count / totalPixels) * 100)
  } else {
    histogramData.value = new Array(10).fill(0)
  }
}

// Watch for media/canvas changes
watch([media, scaledCanvasARef, scaledCanvasCRef], async () => {
  await nextTick()
  renderSourceImage()
  renderLuminanceMap()
  renderTextRegion()
  renderApcaScoreMap()
  calculateHistogram()
})

// Watch for text changes
watch([textContent, verticalAlign, horizontalAlign, textMeasureRef, scaledCanvasDRef], async () => {
  await nextTick()
  updateTextBounds()
  renderTextRegion()
  renderApcaScoreMap()
  calculateHistogram()
})

// Watch for text color changes
watch([textColor, scaledCanvasFRef], async () => {
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

          <!-- Row 1: A, B -->
          <div class="node-row">
            <!-- Node A: Source Image -->
            <div ref="nodeARef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">A</span>
                <span class="node-title-text">Source</span>
              </div>
              <div class="node-preview">
                <ScaledCanvas
                  ref="scaledCanvasARef"
                  :canvas-width="CANVAS_WIDTH"
                  :canvas-height="CANVAS_HEIGHT"
                  :class="{ 'opacity-0': !media }"
                />
                <p v-if="!media" class="node-empty">No image</p>
              </div>
            </div>

            <!-- Node B: Text Layer -->
            <div ref="nodeBRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">B</span>
                <span class="node-title-text">Text</span>
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
          </div>

          <!-- Row 2: C, D, E -->
          <div class="node-row">
            <!-- Node C: APCA Luminance -->
            <div ref="nodeCRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">C</span>
                <span class="node-title-text">Luminance</span>
              </div>
              <div class="node-preview">
                <ScaledCanvas
                  ref="scaledCanvasCRef"
                  :canvas-width="CANVAS_WIDTH"
                  :canvas-height="CANVAS_HEIGHT"
                  :class="{ 'opacity-0': !media }"
                />
                <p v-if="!media" class="node-empty">No image</p>
              </div>
            </div>

            <!-- Node D: Text Region from Luminance -->
            <div ref="nodeDRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">D</span>
                <span class="node-title-text">Region</span>
              </div>
              <div class="node-preview">
                <ScaledCanvas
                  ref="scaledCanvasDRef"
                  :canvas-width="NODE_WIDTH"
                  :canvas-height="NODE_HEIGHT"
                  :class="{ 'opacity-0': !textBounds }"
                />
                <p v-if="!textBounds" class="node-empty">No text</p>
              </div>
            </div>

            <!-- Node E: Text Color Y -->
            <div ref="nodeERef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">E</span>
                <span class="node-title-text">Text Y</span>
              </div>
              <div class="node-preview node-preview-center">
                <div class="value-display">
                  <div class="value-color" :style="{ backgroundColor: textColor }"></div>
                  <span class="value-number">{{ textColorY.toFixed(4) }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Row 3: F -->
          <div class="node-row">
            <!-- Node F: APCA Score Map -->
            <div ref="nodeFRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">F</span>
                <span class="node-title-text">APCA Score</span>
              </div>
              <div class="node-preview">
                <ScaledCanvas
                  ref="scaledCanvasFRef"
                  :canvas-width="NODE_WIDTH"
                  :canvas-height="NODE_HEIGHT"
                  :class="{ 'opacity-0': !textBounds }"
                />
                <p v-if="!textBounds" class="node-empty">No data</p>
              </div>
            </div>
          </div>

          <!-- Row 4: G -->
          <div class="node-row">
            <!-- Node G: Histogram -->
            <div ref="nodeGRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">G</span>
                <span class="node-title-text">Distribution</span>
              </div>
              <div class="node-preview node-preview-histogram">
                <div class="histogram">
                  <div
                    v-for="(value, index) in histogramData"
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
          </div>

          <!-- Row 5: H -->
          <div class="node-row">
            <!-- Node H: Final Score -->
            <div ref="nodeHRef" class="node-wrapper">
              <div class="node-title">
                <span class="node-badge">H</span>
                <span class="node-title-text">Score</span>
              </div>
              <div class="node-preview node-preview-center">
                <div class="score-display">
                  <span class="score-number">{{ calculatedScore }}</span>
                  <span class="score-label">APCA Lc</span>
                </div>
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
  display: flex;
  flex-direction: column;
  align-items: center;
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

.node-row {
  display: flex;
  gap: 3rem;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.node-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
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
