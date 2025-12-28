/**
 * NodeId - ツリーノードの一意識別子
 */

export type NodeId = string & { readonly __brand: 'NodeId' }

/** ルートノードのID */
export const ROOT_NODE_ID = 'node_root' as NodeId

let nodeIdCounter = 0

export const $NodeId = {
  /** 新しいNodeIdを生成 */
  generate: (): NodeId => {
    const timestamp = Date.now().toString(36)
    const counter = (++nodeIdCounter).toString(36).padStart(4, '0')
    const random = Math.random().toString(36).substring(2, 6)
    return `node_${timestamp}_${counter}_${random}` as NodeId
  },

  /** 文字列からNodeIdを作成 */
  fromString: (value: string): NodeId => value as NodeId,

  /** ルートNodeIdかどうか */
  isRoot: (id: NodeId): boolean => id === ROOT_NODE_ID,

  /** NodeIdかどうかを判定 */
  isValid: (value: string): value is NodeId => {
    return typeof value === 'string' && (value.startsWith('node_') || value === ROOT_NODE_ID)
  },
}
