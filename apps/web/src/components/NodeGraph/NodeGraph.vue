<script setup lang="ts">
import { ref, computed, nextTick, onMounted, toRef, watch } from 'vue'
import type { Connection } from './types'
import { useNodeConnections } from './useNodeConnections'

export interface GroupBox {
  id: string
  nodeIds: string[]
  label?: string
}

const props = withDefaults(
  defineProps<{
    connections: Connection[]
    columns?: number
    gap?: string
    groups?: GroupBox[]
  }>(),
  {
    columns: 8,
    gap: '3rem',
    groups: () => [],
  }
)

const containerRef = ref<HTMLElement | null>(null)
const nodeRefs = ref<Map<string, HTMLElement | null>>(new Map())

const connectionsRef = toRef(props, 'connections')
const { paths, updateConnections } = useNodeConnections(
  containerRef,
  nodeRefs,
  connectionsRef
)

function setNodeRef(nodeId: string, el: HTMLElement | null) {
  if (el) {
    nodeRefs.value.set(nodeId, el)
  }
}

const gridStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.columns}, 1fr)`,
  gap: props.gap,
}))

// Calculate bounding box SVG rects for groups
const groupRects = ref<Array<{ id: string; x: number; y: number; width: number; height: number; label?: string }>>([])

function updateGroupRects() {
  if (!containerRef.value || !props.groups?.length) {
    groupRects.value = []
    return
  }

  const containerRect = containerRef.value.getBoundingClientRect()
  const rects: typeof groupRects.value = []

  for (const group of props.groups) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
    let foundAny = false

    for (const nodeId of group.nodeIds) {
      const nodeEl = nodeRefs.value.get(nodeId)
      if (nodeEl) {
        const rect = nodeEl.getBoundingClientRect()
        minX = Math.min(minX, rect.left - containerRect.left)
        minY = Math.min(minY, rect.top - containerRect.top)
        maxX = Math.max(maxX, rect.right - containerRect.left)
        maxY = Math.max(maxY, rect.bottom - containerRect.top)
        foundAny = true
      }
    }

    if (foundAny) {
      const padding = 12
      rects.push({
        id: group.id,
        x: minX - padding,
        y: minY - padding,
        width: maxX - minX + padding * 2,
        height: maxY - minY + padding * 2,
        label: group.label,
      })
    }
  }

  groupRects.value = rects
}

onMounted(async () => {
  await nextTick()
  setTimeout(() => {
    updateConnections()
    updateGroupRects()
  }, 100)
})

watch(() => props.groups, () => {
  nextTick(updateGroupRects)
}, { deep: true })

defineExpose({
  updateConnections,
  updateGroupRects,
})
</script>

<template>
  <section ref="containerRef" class="node-graph" :style="gridStyle">
    <svg class="connections-overlay">
      <!-- Group boxes (rendered behind connections) -->
      <g v-for="rect in groupRects" :key="rect.id" class="group-box">
        <rect
          :x="rect.x"
          :y="rect.y"
          :width="rect.width"
          :height="rect.height"
          class="group-rect"
          rx="4"
          ry="4"
        />
        <text
          v-if="rect.label"
          :x="rect.x + 8"
          :y="rect.y - 6"
          class="group-label"
        >
          {{ rect.label }}
        </text>
      </g>
      <!-- Connections -->
      <path
        v-for="(path, index) in paths"
        :key="index"
        :d="path"
        class="connection-line"
      />
    </svg>
    <slot :setNodeRef="setNodeRef" />
  </section>
</template>

<style scoped>
.node-graph {
  position: relative;
  display: grid;
}

.connections-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
  overflow: visible;
}

.group-rect {
  fill: rgba(74, 74, 90, 0.2);
  stroke: #4a4a5a;
  stroke-width: 1;
  stroke-dasharray: 4 2;
}

.group-label {
  fill: #8a8a9a;
  font-size: 11px;
  font-weight: 500;
}

.connection-line {
  fill: none;
  stroke: #3b4d7a;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.8;
}
</style>
