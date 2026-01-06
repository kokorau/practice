export type EdgePosition = 'top' | 'bottom' | 'left' | 'right'

export interface ConnectionEndpoint {
  nodeId: string
  position: EdgePosition
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
