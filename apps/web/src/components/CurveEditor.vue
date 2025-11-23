<script setup lang="ts">
import { computed, ref, onUnmounted } from 'vue'
import { $Curve, type Curve } from '../modules/Filter/Domain'

const props = defineProps<{
  curve: Curve
  width?: number
  height?: number
}>()

const emit = defineEmits<{
  'update:point': [index: number, value: number]
}>()

const width = computed(() => props.width ?? 256)
const height = computed(() => props.height ?? 150)

const xs = computed(() => $Curve.getXPositions(props.curve.points.length))

// SVGパスを生成
const curvePath = computed(() => {
  const interpolate = $Curve.getInterpolator(props.curve)
  const points: string[] = []
  const steps = 100

  for (let i = 0; i <= steps; i++) {
    const x = i / steps
    const y = interpolate(x)
    const px = x * width.value
    const py = (1 - y) * height.value // SVGはY軸が逆
    points.push(i === 0 ? `M ${px} ${py}` : `L ${px} ${py}`)
  }

  return points.join(' ')
})

// コントロールポイントの位置
const controlPoints = computed(() =>
  props.curve.points.map((y, i) => ({
    x: xs.value[i]! * width.value,
    y: (1 - y) * height.value,
    index: i,
  }))
)

// SVG要素の参照
const svgRef = ref<SVGSVGElement | null>(null)

// ドラッグ処理
const draggingIndex = ref<number | null>(null)

const handleMouseMove = (e: MouseEvent) => {
  if (draggingIndex.value === null) return

  const svg = svgRef.value
  if (!svg) return

  const rect = svg.getBoundingClientRect()
  const y = (e.clientY - rect.top) / rect.height
  const value = Math.max(0, Math.min(1, 1 - y))

  emit('update:point', draggingIndex.value, value)
}

const handleMouseUp = () => {
  draggingIndex.value = null
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
}

const handleMouseDown = (index: number) => {
  draggingIndex.value = index
  window.addEventListener('mousemove', handleMouseMove)
  window.addEventListener('mouseup', handleMouseUp)
}

// コンポーネント破棄時にリスナーをクリーンアップ
onUnmounted(() => {
  window.removeEventListener('mousemove', handleMouseMove)
  window.removeEventListener('mouseup', handleMouseUp)
})
</script>

<template>
  <svg
    ref="svgRef"
    class="curve-editor-svg bg-gray-900 rounded"
    :width="width"
    :height="height"
    :viewBox="`0 0 ${width} ${height}`"
  >
    <!-- グリッド -->
    <line
      v-for="i in 3"
      :key="`h${i}`"
      :x1="0"
      :y1="(i * height) / 4"
      :x2="width"
      :y2="(i * height) / 4"
      stroke="#333"
      stroke-width="1"
    />
    <line
      v-for="i in 3"
      :key="`v${i}`"
      :x1="(i * width) / 4"
      :y1="0"
      :x2="(i * width) / 4"
      :y2="height"
      stroke="#333"
      stroke-width="1"
    />

    <!-- 対角線 (リニア参照) -->
    <line :x1="0" :y1="height" :x2="width" :y2="0" stroke="#555" stroke-width="1" stroke-dasharray="4" />

    <!-- カーブ -->
    <path :d="curvePath" fill="none" stroke="#fff" stroke-width="2" />

    <!-- コントロールポイント -->
    <circle
      v-for="point in controlPoints"
      :key="point.index"
      :cx="point.x"
      :cy="point.y"
      r="6"
      fill="#4ade80"
      stroke="#fff"
      stroke-width="2"
      class="cursor-ns-resize"
      @mousedown.prevent="handleMouseDown(point.index)"
    />
  </svg>
</template>
