import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import type { Connection, EdgePosition } from './types'

interface Point {
  x: number
  y: number
}

function getNodeEdge(
  nodeRef: HTMLElement | null,
  container: HTMLElement | null,
  position: EdgePosition,
  portOffset?: number
): Point {
  if (!nodeRef || !container) return { x: 0, y: 0 }

  // Find the actual node-body element for accurate port positioning
  const nodeBody = nodeRef.querySelector('.node-body') as HTMLElement | null
  const targetElement = nodeBody || nodeRef

  const nodeRect = targetElement.getBoundingClientRect()
  const containerRect = container.getBoundingClientRect()

  const left = nodeRect.left - containerRect.left
  const top = nodeRect.top - containerRect.top

  // Use portOffset if provided, otherwise default to center (0.5)
  const yOffset = portOffset ?? 0.5
  const yPos = top + nodeRect.height * yOffset

  switch (position) {
    case 'top':
      return { x: left + nodeRect.width / 2, y: top }
    case 'bottom':
      return { x: left + nodeRect.width / 2, y: top + nodeRect.height }
    case 'left':
      return { x: left, y: yPos }
    case 'right':
      return { x: left + nodeRect.width, y: yPos }
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

      const fromPos = getNodeEdge(fromNode ?? null, container, conn.from.position, conn.from.portOffset)
      const toPos = getNodeEdge(toNode ?? null, container, conn.to.position, conn.to.portOffset)

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
