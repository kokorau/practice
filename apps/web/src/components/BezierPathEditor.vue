<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue'
import { useBezierPathEditor } from '../composables/useBezierPathEditor'
import { type BezierPath, type HandleMode } from '../modules/BezierPath'

const props = withDefaults(
  defineProps<{
    path: BezierPath
    width?: number
    height?: number
    /** Padding inside the SVG for overflow curves */
    padding?: number
  }>(),
  {
    width: 300,
    height: 200,
    padding: 20,
  }
)

const emit = defineEmits<{
  'update:path': [path: BezierPath]
}>()

// ============================================================
// Editor State
// ============================================================
const { state, actions } = useBezierPathEditor(props.path)

// Sync with external path prop
watch(
  () => props.path,
  (newPath) => {
    actions.setPath(newPath)
  }
)

// Emit changes
watch(
  () => state.path.value,
  (newPath) => {
    emit('update:path', newPath)
  },
  { deep: true }
)

// ============================================================
// SVG References and Dimensions
// ============================================================
const svgRef = ref<SVGSVGElement | null>(null)

// Actual drawing area (inside padding)
const drawWidth = computed(() => props.width - props.padding * 2)
const drawHeight = computed(() => props.height - props.padding * 2)

// ============================================================
// Coordinate Conversion
// ============================================================
const toSvgX = (bezierX: number) => props.padding + bezierX * drawWidth.value
const toSvgY = (bezierY: number) => props.padding + (1 - bezierY) * drawHeight.value

const toBezierX = (svgX: number) => (svgX - props.padding) / drawWidth.value

// ============================================================
// SVG Paths
// ============================================================
const curvePath = computed(() => {
  const { anchors } = state.path.value
  if (anchors.length < 2) return ''

  const parts: string[] = []

  // Move to first point
  const first = anchors[0]!
  parts.push(`M ${toSvgX(first.x)} ${toSvgY(first.y)}`)

  // Cubic bezier to each subsequent point
  for (let i = 0; i < anchors.length - 1; i++) {
    const p0 = anchors[i]!
    const p1 = anchors[i + 1]!

    const cp1x = toSvgX(p0.x + p0.handleOut.dx)
    const cp1y = toSvgY(p0.y + p0.handleOut.dy)
    const cp2x = toSvgX(p1.x + p1.handleIn.dx)
    const cp2y = toSvgY(p1.y + p1.handleIn.dy)
    const endX = toSvgX(p1.x)
    const endY = toSvgY(p1.y)

    parts.push(`C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${endX} ${endY}`)
  }

  return parts.join(' ')
})

// ============================================================
// Anchor and Handle Data for Rendering
// ============================================================
const anchorPoints = computed(() =>
  state.path.value.anchors.map((anchor, index) => ({
    index,
    x: toSvgX(anchor.x),
    y: toSvgY(anchor.y),
    handleInX: toSvgX(anchor.x + anchor.handleIn.dx),
    handleInY: toSvgY(anchor.y + anchor.handleIn.dy),
    handleOutX: toSvgX(anchor.x + anchor.handleOut.dx),
    handleOutY: toSvgY(anchor.y + anchor.handleOut.dy),
    handleMode: anchor.handleMode,
    isFirst: index === 0,
    isLast: index === state.path.value.anchors.length - 1,
    isSelected: state.selectedAnchorIndex.value === index,
  }))
)

// ============================================================
// X Constraint Visualization
// ============================================================
const xConstraintRect = computed(() => {
  if (!state.isDragging.value || state.dragTarget.value?.type !== 'anchor') return null
  if (state.xConstraints.value === null) return null

  const { min, max } = state.xConstraints.value
  return {
    x: toSvgX(min),
    width: toSvgX(max) - toSvgX(min),
    y: props.padding,
    height: drawHeight.value,
  }
})

// ============================================================
// Pointer Handling
// ============================================================
let currentPointerId: number | null = null

const handlePointerDown = (e: PointerEvent) => {
  // Only handle primary button
  if (e.button !== 0) return

  currentPointerId = e.pointerId
  svgRef.value?.setPointerCapture(e.pointerId)
}

const handlePointerMove = (e: PointerEvent) => {
  if (currentPointerId === null) return
  if (!svgRef.value) return

  const rect = svgRef.value.getBoundingClientRect()
  actions.updateDrag(e, rect)
}

const handlePointerUp = () => {
  if (currentPointerId !== null) {
    svgRef.value?.releasePointerCapture(currentPointerId)
    currentPointerId = null
  }
  actions.endDrag()
}

const handleAnchorPointerDown = (index: number, e: PointerEvent) => {
  e.stopPropagation()
  actions.startDrag({ type: 'anchor', index }, e)
  handlePointerDown(e)
}

const handleHandlePointerDown = (index: number, type: 'handleIn' | 'handleOut', e: PointerEvent) => {
  e.stopPropagation()
  actions.startDrag({ type: type === 'handleIn' ? 'handleIn' : 'handleOut', index }, e)
  handlePointerDown(e)
}

// ============================================================
// Curve Click (Add Anchor)
// ============================================================
const handleCurveClick = (e: MouseEvent) => {
  if (!svgRef.value) return
  if (state.isDragging.value) return

  const rect = svgRef.value.getBoundingClientRect()
  const svgX = e.clientX - rect.left
  const bezierX = toBezierX(svgX)

  // Only add if click is on the curve area
  if (bezierX > 0.001 && bezierX < 0.999) {
    actions.addAnchorAtX(bezierX)
  }
}

// ============================================================
// Keyboard Handling
// ============================================================
const handleKeyDown = (e: KeyboardEvent) => {
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault()
    actions.deleteSelectedAnchor()
  }
}

// ============================================================
// Handle Mode Toggle (Double Click)
// ============================================================
const handleAnchorDoubleClick = (index: number) => {
  const anchor = state.path.value.anchors[index]
  if (!anchor) return

  // Cycle through modes: auto -> smooth -> corner -> auto
  const modes: HandleMode[] = ['auto', 'smooth', 'corner']
  const currentIndex = modes.indexOf(anchor.handleMode)
  const nextMode = modes[(currentIndex + 1) % modes.length]!

  actions.setHandleMode(index, nextMode)
}

// ============================================================
// Background Click (Deselect)
// ============================================================
const handleBackgroundClick = (e: MouseEvent) => {
  // Only deselect if clicking on the background, not on elements
  if (e.target === svgRef.value) {
    actions.selectAnchor(null)
  }
}

// ============================================================
// Lifecycle
// ============================================================
onMounted(() => {
  window.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
  <svg
    ref="svgRef"
    class="bezier-path-editor bg-gray-900 rounded select-none"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
    tabindex="0"
    @click="handleBackgroundClick"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerUp"
    @pointercancel="handlePointerUp"
  >
    <!-- Grid lines -->
    <line
      v-for="i in 3"
      :key="`h${i}`"
      :x1="padding"
      :y1="padding + (i * drawHeight) / 4"
      :x2="padding + drawWidth"
      :y2="padding + (i * drawHeight) / 4"
      stroke="#333"
      stroke-width="1"
    />
    <line
      v-for="i in 3"
      :key="`v${i}`"
      :x1="padding + (i * drawWidth) / 4"
      :y1="padding"
      :x2="padding + (i * drawWidth) / 4"
      :y2="padding + drawHeight"
      stroke="#333"
      stroke-width="1"
    />

    <!-- Drawing area border -->
    <rect
      :x="padding"
      :y="padding"
      :width="drawWidth"
      :height="drawHeight"
      fill="none"
      stroke="#444"
      stroke-width="1"
    />

    <!-- Diagonal line (linear reference) -->
    <line
      :x1="toSvgX(0)"
      :y1="toSvgY(0)"
      :x2="toSvgX(1)"
      :y2="toSvgY(1)"
      stroke="#555"
      stroke-width="1"
      stroke-dasharray="4"
    />

    <!-- X constraint highlight (shown during anchor drag) -->
    <rect
      v-if="xConstraintRect"
      :x="xConstraintRect.x"
      :y="xConstraintRect.y"
      :width="xConstraintRect.width"
      :height="xConstraintRect.height"
      fill="rgba(74, 222, 128, 0.1)"
      stroke="rgba(74, 222, 128, 0.3)"
      stroke-width="1"
    />

    <!-- Curve hit area (wider transparent path for easier clicking) -->
    <path
      :d="curvePath"
      fill="none"
      stroke="transparent"
      stroke-width="16"
      class="cursor-crosshair"
      @click="handleCurveClick"
    />

    <!-- Main curve path -->
    <path :d="curvePath" fill="none" stroke="#fff" stroke-width="2" />

    <!-- Anchors and handles -->
    <g v-for="point in anchorPoints" :key="point.index">
      <!-- Handle lines (only show when anchor is selected) -->
      <template v-if="point.isSelected">
        <!-- Handle In line (not for first point) -->
        <line
          v-if="!point.isFirst"
          :x1="point.x"
          :y1="point.y"
          :x2="point.handleInX"
          :y2="point.handleInY"
          stroke="#888"
          stroke-width="1"
        />
        <!-- Handle Out line (not for last point) -->
        <line
          v-if="!point.isLast"
          :x1="point.x"
          :y1="point.y"
          :x2="point.handleOutX"
          :y2="point.handleOutY"
          stroke="#888"
          stroke-width="1"
        />

        <!-- Handle In circle (not for first point) -->
        <circle
          v-if="!point.isFirst"
          :cx="point.handleInX"
          :cy="point.handleInY"
          r="5"
          fill="#666"
          stroke="#fff"
          stroke-width="1"
          class="cursor-move"
          @pointerdown="handleHandlePointerDown(point.index, 'handleIn', $event)"
        />
        <!-- Handle Out circle (not for last point) -->
        <circle
          v-if="!point.isLast"
          :cx="point.handleOutX"
          :cy="point.handleOutY"
          r="5"
          fill="#666"
          stroke="#fff"
          stroke-width="1"
          class="cursor-move"
          @pointerdown="handleHandlePointerDown(point.index, 'handleOut', $event)"
        />
      </template>

      <!-- Anchor point -->
      <circle
        :cx="point.x"
        :cy="point.y"
        r="6"
        :fill="point.isSelected ? '#4ade80' : '#fff'"
        :stroke="point.isSelected ? '#fff' : '#4ade80'"
        stroke-width="2"
        :class="[
          point.isFirst || point.isLast ? 'cursor-ns-resize' : 'cursor-move',
        ]"
        @pointerdown="handleAnchorPointerDown(point.index, $event)"
        @dblclick="handleAnchorDoubleClick(point.index)"
      />

      <!-- Handle mode indicator (small icon) -->
      <text
        v-if="point.isSelected"
        :x="point.x + 10"
        :y="point.y - 10"
        fill="#888"
        font-size="10"
        font-family="monospace"
      >
        {{ point.handleMode === 'auto' ? 'A' : point.handleMode === 'smooth' ? 'S' : 'C' }}
      </text>
    </g>
  </svg>
</template>
