<script setup lang="ts">
import { ref, computed, nextTick, onMounted, toRef } from 'vue'
import type { Connection } from './types'
import { useNodeConnections } from './useNodeConnections'

const props = withDefaults(
  defineProps<{
    connections: Connection[]
    columns?: number
    gap?: string
  }>(),
  {
    columns: 8,
    gap: '3rem',
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

onMounted(async () => {
  await nextTick()
  setTimeout(updateConnections, 100)
})

defineExpose({
  updateConnections,
})
</script>

<template>
  <section ref="containerRef" class="node-graph" :style="gridStyle">
    <svg class="connections-overlay">
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
}

.connection-line {
  fill: none;
  stroke: #4ecdc4;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  opacity: 0.5;
}
</style>
