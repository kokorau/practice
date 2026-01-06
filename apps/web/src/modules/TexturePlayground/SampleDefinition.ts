import type { TextureRenderSpec, Viewport } from '@practice/texture'

/** Parameter types for dynamic controls */
export type ParamType = 'slider' | 'color' | 'select' | 'number' | 'curve'

/** Select option for dropdown controls */
export interface SelectOption {
  value: string | number
  label: string
}

/** Parameter definition for dynamic controls */
export interface ParamDef {
  key: string
  label: string
  type: ParamType
  min?: number
  max?: number
  step?: number
  options?: SelectOption[]
  default: unknown
}

/** Node definition in the composition graph */
export interface NodeDef {
  id: string
  badge: string
  label: string
  params: ParamDef[]
  /** Row index for layout (0-based) */
  row: number
  /** Creates spec from current params and viewport. Null for parameter-only nodes */
  createSpec: ((params: Record<string, unknown>, viewport: Viewport) => TextureRenderSpec) | null
}

/** Connection between nodes */
export interface ConnectionDef {
  from: string
  to: string
}

/** Sample category */
export type SampleCategory = 'gradient' | 'masked' | 'postEffect'

/** Parameter values for a sample (node id -> param key -> value) */
export type SampleParams = Record<string, Record<string, unknown>>

/** Sample definition interface */
export interface SampleDefinition {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly category: SampleCategory
  readonly nodes: NodeDef[]
  readonly connections: ConnectionDef[]
  /** Creates the final output spec from all node params */
  readonly createOutputSpec: (params: SampleParams, viewport: Viewport) => TextureRenderSpec
}

/** Initialize params from sample definition with default values */
export function initializeSampleParams(sample: SampleDefinition): SampleParams {
  const params: SampleParams = {}
  for (const node of sample.nodes) {
    params[node.id] = {}
    for (const param of node.params) {
      params[node.id]![param.key] = param.default
    }
  }
  return params
}

/** Get nodes grouped by row for layout */
export function getNodesByRow(sample: SampleDefinition): NodeDef[][] {
  const maxRow = Math.max(...sample.nodes.map(n => n.row))
  const rows: NodeDef[][] = Array.from({ length: maxRow + 1 }, () => [])
  for (const node of sample.nodes) {
    rows[node.row]!.push(node)
  }
  return rows
}
