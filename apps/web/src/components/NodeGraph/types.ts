export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export interface ConnectionEndpoint {
  nodeId: string
  position: EdgePosition
  /**
   * Vertical offset ratio (0-1) for multiple ports on the same edge.
   * 0 = top, 0.5 = center (default), 1 = bottom.
   * For mask nodes: main input = 0.3, mask input = 0.7
   */
  portOffset?: number
}

export interface Connection {
  from: ConnectionEndpoint
  to: ConnectionEndpoint
}

export type NodeSize = 's' | 'm' | 'l'

export const NODE_SIZES: Record<NodeSize, { width: number; height: number }> = {
  s: { width: 200, height: 112 },
  m: { width: 400, height: 224 },
  l: { width: 600, height: 336 },
}
