/**
 * AssetNode - ツリー構造のノード
 *
 * フォルダまたはアセットへの参照を表す
 */

import type { AssetId } from '../../../Asset'
import type { NodeId } from './NodeId'
import { $NodeId, ROOT_NODE_ID } from './NodeId'

/** フォルダノード */
export type FolderNode = {
  type: 'folder'
  id: NodeId
  name: string
  parentId: NodeId | null
  childIds: readonly NodeId[]
  createdAt: Date
  updatedAt: Date
}

/** アセット参照ノード */
export type AssetRefNode = {
  type: 'assetRef'
  id: NodeId
  name: string
  parentId: NodeId
  assetId: AssetId
  createdAt: Date
  updatedAt: Date
}

/** ノードの共用体型 */
export type AssetNode = FolderNode | AssetRefNode

export const $AssetNode = {
  /** ルートフォルダを作成 */
  createRoot: (): FolderNode => {
    const now = new Date()
    return {
      type: 'folder',
      id: ROOT_NODE_ID,
      name: 'Root',
      parentId: null,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    }
  },

  /** フォルダを作成 */
  createFolder: (name: string, parentId: NodeId): FolderNode => {
    const now = new Date()
    return {
      type: 'folder',
      id: $NodeId.generate(),
      name,
      parentId,
      childIds: [],
      createdAt: now,
      updatedAt: now,
    }
  },

  /** アセット参照を作成 */
  createAssetRef: (name: string, parentId: NodeId, assetId: AssetId): AssetRefNode => {
    const now = new Date()
    return {
      type: 'assetRef',
      id: $NodeId.generate(),
      name,
      parentId,
      assetId,
      createdAt: now,
      updatedAt: now,
    }
  },

  /** フォルダかどうか */
  isFolder: (node: AssetNode): node is FolderNode => node.type === 'folder',

  /** アセット参照かどうか */
  isAssetRef: (node: AssetNode): node is AssetRefNode => node.type === 'assetRef',

  /** ルートノードかどうか */
  isRoot: (node: AssetNode): boolean => $NodeId.isRoot(node.id),

  /** 名前を更新 */
  rename: (node: AssetNode, name: string): AssetNode => ({
    ...node,
    name,
    updatedAt: new Date(),
  }),

  /** フォルダに子を追加 */
  addChild: (folder: FolderNode, childId: NodeId): FolderNode => ({
    ...folder,
    childIds: [...folder.childIds, childId],
    updatedAt: new Date(),
  }),

  /** フォルダから子を削除 */
  removeChild: (folder: FolderNode, childId: NodeId): FolderNode => ({
    ...folder,
    childIds: folder.childIds.filter((id) => id !== childId),
    updatedAt: new Date(),
  }),
}
