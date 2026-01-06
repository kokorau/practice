import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { Connection, EdgePosition } from './types'

interface Point {
  x: number
  y: number
}

function getNodeEdge(
  nodeRef: HTMLElement | null,
  container: HTMLElement | null,
  position: EdgePosition
): Point {
  if (!nodeRef || !container) return { x: 0, y: 0 }

  const nodeRect = nodeRef.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const left = nodeRect.left - containerRect.left
  const top = nodeRect.top - containerRect.top
  const centerX = left + nodeRect.width / 2
  const centerY = top + nodeRect.height / 2

  switch (position) {
    case 'top':
      return { x: centerX, y: top }
    case 'bottom':
      return { x: centerX, y: top + nodeRect.height }
    case 'left':
      return { x: left, y: centerY }
    case 'right':
      return { x: left + nodeRect.width, y: centerY }
  }
}

function createBezierPath(from: Point, to: Point, isHorizontal: boolean): string {
  if (isHorizontal) {
    const midX = (from.x + to.x) / 2
    return `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`
  } else {
    const midY = (from.y + to.y) / 2
    return `M ${from.x} ${from.y} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${to.y}`
  }
}

export function useNodeConnections(
  containerRef: Ref<HTMLElement | null>,
  nodeRefs: Ref<Map<string, HTMLElement | null>>,
  connections: Ref<Connection[]>
) {
  const paths = ref<string[]>([])

  function updateConnections() {
    if (!containerRef.value) return

    const container = containerRef.value
    const newPaths: string[] = []

    for (const conn of connections.value) {
      const fromNode = nodeRefs.value.get(conn.from.nodeId)
      const toNode = nodeRefs.value.get(conn.to.nodeId)

      const fromPos = getNodeEdge(fromNode ?? null, container, conn.from.position)
      const toPos = getNodeEdge(toNode ?? null, container, conn.to.position)

      const isHorizontal =
        conn.from.position === 'left' || conn.from.position === 'right'
      const path = createBezierPath(fromPos, toPos, isHorizontal)

      newPaths.push(path)
    }

    paths.value = newPaths
  }

  watch(
    [containerRef, nodeRefs, connections],
    () => updateConnections(),
    { deep: true }
  )

  onMounted(() => {
    window.addEventListener('resize', updateConnections)
  })

  onUnmounted(() => {
    window.removeEventListener('resize', updateConnections)
  })

  return {
    paths,
    updateConnections,
  }
}
