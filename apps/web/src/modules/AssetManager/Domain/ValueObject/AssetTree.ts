/**
 * AssetTree - アセットのツリー構造全体を管理
 */

import type { AssetId } from '../../../Asset'
import type { AssetNode, FolderNode, AssetRefNode } from './AssetNode'
import { $AssetNode } from './AssetNode'
import type { NodeId } from './NodeId'
import { ROOT_NODE_ID } from './NodeId'

/** アセットツリー */
export type AssetTree = {
  /** ノードのマップ（id -> node） */
  readonly nodes: ReadonlyMap<NodeId, AssetNode>
  /** ルートノードのID */
  readonly rootId: NodeId
}

export const $AssetTree = {
  /** 空のツリーを作成 */
  create: (): AssetTree => {
    const root = $AssetNode.createRoot()
    return {
      nodes: new Map([[root.id, root]]),
      rootId: ROOT_NODE_ID,
    }
  },

  /** ルートノードを取得 */
  getRoot: (tree: AssetTree): FolderNode => {
    return tree.nodes.get(tree.rootId) as FolderNode
  },

  /** ノードを取得 */
  getNode: (tree: AssetTree, id: NodeId): AssetNode | undefined => {
    return tree.nodes.get(id)
  },

  /** フォルダを取得 */
  getFolder: (tree: AssetTree, id: NodeId): FolderNode | undefined => {
    const node = tree.nodes.get(id)
    return node && $AssetNode.isFolder(node) ? node : undefined
  },

  /** フォルダを追加 */
  addFolder: (tree: AssetTree, name: string, parentId: NodeId): AssetTree => {
    const parent = $AssetTree.getFolder(tree, parentId)
    if (!parent) return tree

    const folder = $AssetNode.createFolder(name, parentId)
    const updatedParent = $AssetNode.addChild(parent, folder.id)

    const newNodes = new Map(tree.nodes)
    newNodes.set(folder.id, folder)
    newNodes.set(parentId, updatedParent)

    return { ...tree, nodes: newNodes }
  },

  /** アセット参照を追加 */
  addAssetRef: (tree: AssetTree, name: string, parentId: NodeId, assetId: AssetId): AssetTree => {
    const parent = $AssetTree.getFolder(tree, parentId)
    if (!parent) return tree

    const assetRef = $AssetNode.createAssetRef(name, parentId, assetId)
    const updatedParent = $AssetNode.addChild(parent, assetRef.id)

    const newNodes = new Map(tree.nodes)
    newNodes.set(assetRef.id, assetRef)
    newNodes.set(parentId, updatedParent)

    return { ...tree, nodes: newNodes }
  },

  /** ノードを削除（子も再帰的に削除） */
  removeNode: (tree: AssetTree, id: NodeId): AssetTree => {
    const node = tree.nodes.get(id)
    if (!node || $AssetNode.isRoot(node)) return tree

    // 親から参照を削除
    const parent = tree.nodes.get(node.parentId!) as FolderNode | undefined
    if (!parent) return tree

    const newNodes = new Map(tree.nodes)
    const updatedParent = $AssetNode.removeChild(parent, id)
    newNodes.set(parent.id, updatedParent)

    // 子を再帰的に削除
    const removeRecursive = (nodeId: NodeId) => {
      const n = newNodes.get(nodeId)
      if (!n) return

      if ($AssetNode.isFolder(n)) {
        for (const childId of n.childIds) {
          removeRecursive(childId)
        }
      }
      newNodes.delete(nodeId)
    }

    removeRecursive(id)

    return { ...tree, nodes: newNodes }
  },

  /** ノードを移動 */
  moveNode: (tree: AssetTree, id: NodeId, newParentId: NodeId): AssetTree => {
    const node = tree.nodes.get(id)
    if (!node || $AssetNode.isRoot(node)) return tree
    if (node.parentId === newParentId) return tree

    const oldParent = tree.nodes.get(node.parentId!) as FolderNode | undefined
    const newParent = $AssetTree.getFolder(tree, newParentId)
    if (!oldParent || !newParent) return tree

    // 循環参照チェック（新しい親が自分の子孫でないか）
    if ($AssetNode.isFolder(node)) {
      let checkId: NodeId | null = newParentId
      while (checkId) {
        if (checkId === id) return tree // 循環参照を防止
        const checkNode = tree.nodes.get(checkId)
        checkId = checkNode?.parentId ?? null
      }
    }

    const newNodes = new Map(tree.nodes)

    // 旧親から削除
    newNodes.set(oldParent.id, $AssetNode.removeChild(oldParent, id))

    // 新親に追加
    newNodes.set(newParentId, $AssetNode.addChild(newParent, id))

    // ノード自体の親を更新
    const updatedNode = { ...node, parentId: newParentId, updatedAt: new Date() }
    newNodes.set(id, updatedNode as AssetNode)

    return { ...tree, nodes: newNodes }
  },

  /** ノードをリネーム */
  renameNode: (tree: AssetTree, id: NodeId, name: string): AssetTree => {
    const node = tree.nodes.get(id)
    if (!node) return tree

    const newNodes = new Map(tree.nodes)
    newNodes.set(id, $AssetNode.rename(node, name))

    return { ...tree, nodes: newNodes }
  },

  /** フォルダの子ノードを取得 */
  getChildren: (tree: AssetTree, folderId: NodeId): readonly AssetNode[] => {
    const folder = $AssetTree.getFolder(tree, folderId)
    if (!folder) return []

    return folder.childIds
      .map((id) => tree.nodes.get(id))
      .filter((n): n is AssetNode => n !== undefined)
  },

  /** パスを取得（ルートからの配列） */
  getPath: (tree: AssetTree, id: NodeId): readonly AssetNode[] => {
    const path: AssetNode[] = []
    let currentId: NodeId | null = id

    while (currentId) {
      const node = tree.nodes.get(currentId)
      if (!node) break
      path.unshift(node)
      currentId = node.parentId
    }

    return path
  },

  /** パス文字列を取得 */
  getPathString: (tree: AssetTree, id: NodeId): string => {
    const path = $AssetTree.getPath(tree, id)
    return '/' + path.map((n) => n.name).join('/')
  },

  /** 特定のAssetIdを持つノードを検索 */
  findByAssetId: (tree: AssetTree, assetId: AssetId): AssetRefNode | undefined => {
    for (const node of tree.nodes.values()) {
      if ($AssetNode.isAssetRef(node) && node.assetId === assetId) {
        return node
      }
    }
    return undefined
  },

  /** 全てのアセット参照を取得 */
  getAllAssetRefs: (tree: AssetTree): readonly AssetRefNode[] => {
    const refs: AssetRefNode[] = []
    for (const node of tree.nodes.values()) {
      if ($AssetNode.isAssetRef(node)) {
        refs.push(node)
      }
    }
    return refs
  },
}
