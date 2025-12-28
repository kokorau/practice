import { ref, computed, shallowRef } from 'vue'
import type { Asset, AssetId } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'
import type { AssetTree, NodeId, AssetNode, FolderNode } from '../../modules/AssetManager'
import {
  $AssetTree,
  ROOT_NODE_ID,
  $AssetNode,
  createDefaultAssetsUseCase,
} from '../../modules/AssetManager'

const defaultData = createDefaultAssetsUseCase()

/** アセットストレージ（id -> Asset） */
const assets = shallowRef<Map<AssetId, Asset>>(defaultData.assets)

const tree = shallowRef<AssetTree>(defaultData.tree)

/** 現在のフォルダID */
const currentFolderId = ref<NodeId>(ROOT_NODE_ID)

/** 選択中のノードID */
const selectedNodeId = ref<NodeId | null>(null)

export const useAssetManager = () => {
  /** 現在のフォルダ */
  const currentFolder = computed<FolderNode>(() => {
    return $AssetTree.getFolder(tree.value, currentFolderId.value) ?? $AssetTree.getRoot(tree.value)
  })

  /** 現在のフォルダ内のノード */
  const currentNodes = computed<readonly AssetNode[]>(() => {
    return $AssetTree.getChildren(tree.value, currentFolderId.value)
  })

  /** 現在のパス */
  const currentPath = computed<string>(() => {
    return $AssetTree.getPathString(tree.value, currentFolderId.value)
  })

  /** パンくずリスト */
  const breadcrumbs = computed<readonly AssetNode[]>(() => {
    return $AssetTree.getPath(tree.value, currentFolderId.value)
  })

  /** ノードに関連するアセットを取得 */
  const getAsset = (node: AssetNode): Asset | undefined => {
    if ($AssetNode.isAssetRef(node)) {
      return assets.value.get(node.assetId)
    }
    return undefined
  }

  /** 選択中のアセットを取得 */
  const selectedAsset = computed<Asset | null>(() => {
    if (!selectedNodeId.value) return null
    const node = $AssetTree.getNode(tree.value, selectedNodeId.value)
    if (!node || !$AssetNode.isAssetRef(node)) return null
    return assets.value.get(node.assetId) ?? null
  })

  /** ノードを選択 */
  const selectNode = (node: AssetNode) => {
    selectedNodeId.value = node.id
  }

  /** フォルダに移動 */
  const navigateTo = (folderId: NodeId) => {
    const folder = $AssetTree.getFolder(tree.value, folderId)
    if (folder) {
      currentFolderId.value = folderId
    }
  }

  /** 親フォルダに移動 */
  const navigateUp = () => {
    const current = currentFolder.value
    if (current.parentId) {
      currentFolderId.value = current.parentId
    }
  }

  /** ノードをクリック（フォルダなら移動） */
  const handleNodeClick = (node: AssetNode) => {
    if ($AssetNode.isFolder(node)) {
      navigateTo(node.id)
    }
  }

  /** 新しいフォルダを作成（ルートに追加） */
  const createFolder = (name: string) => {
    tree.value = $AssetTree.addFolder(tree.value, name, ROOT_NODE_ID)
  }

  /** ファイルを追加（ルートに追加） */
  const addFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const newAssets = new Map(assets.value)

    for (const file of fileArray) {
      const asset = $Asset.fromFile(file)
      newAssets.set(asset.id, asset)
      tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
    }

    assets.value = newAssets
  }

  /** File System Access APIでファイルを選択して追加（ルートに追加） */
  const pickFiles = async () => {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
      })

      const newAssets = new Map(assets.value)

      for (const handle of handles) {
        const asset = await $Asset.fromFileHandle(handle)
        newAssets.set(asset.id, asset)
        tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
      }

      assets.value = newAssets
    } catch (e) {
      // ユーザーがキャンセルした場合は何もしない
      if (e instanceof DOMException && e.name === 'AbortError') {
        return
      }
      throw e
    }
  }

  /** ノードを削除 */
  const removeNode = (nodeId: NodeId) => {
    const node = $AssetTree.getNode(tree.value, nodeId)
    if (!node) return

    // アセット参照の場合、アセット本体も削除
    if ($AssetNode.isAssetRef(node)) {
      const newAssets = new Map(assets.value)
      newAssets.delete(node.assetId)
      assets.value = newAssets
    }

    tree.value = $AssetTree.removeNode(tree.value, nodeId)
  }

  /** ノードをリネーム */
  const renameNode = (nodeId: NodeId, name: string) => {
    tree.value = $AssetTree.renameNode(tree.value, nodeId, name)
  }

  return {
    // State
    tree,
    assets,
    currentFolderId,
    currentFolder,
    currentNodes,
    currentPath,
    breadcrumbs,
    selectedNodeId,
    selectedAsset,

    // Actions
    getAsset,
    selectNode,
    navigateTo,
    navigateUp,
    handleNodeClick,
    createFolder,
    addFiles,
    pickFiles,
    removeNode,
    renameNode,
  }
}
