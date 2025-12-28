/**
 * SemanticColorPaletteGenerator専用のAssetManager
 * グローバル状態ではなく、このView専用のローカル状態を持つ
 */
import { ref, computed, shallowRef } from 'vue'
import type { Asset, AssetId } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'
import type { AssetTree, NodeId, AssetNode, FolderNode } from '../../modules/AssetManager'
import {
  $AssetTree,
  ROOT_NODE_ID,
  $AssetNode,
} from '../../modules/AssetManager'
import {
  DEFAULT_BRAND_GUIDE_CONTENT,
  BRAND_GUIDE_FILENAME,
  BRAND_GUIDE_ASSET_ID,
} from '../../modules/SemanticColorPalette/Domain/constants/defaultBrandGuide'

/** Brand Guide アセットを作成 */
const createBrandGuideAsset = (content: string): Asset => {
  const blob = new Blob([content], { type: 'text/markdown' })
  return $Asset.create({
    id: BRAND_GUIDE_ASSET_ID,
    name: BRAND_GUIDE_FILENAME,
    source: { type: 'blob', blob },
    meta: {
      mimeType: 'text/markdown',
      size: blob.size,
    },
  })
}

/** 初期アセット（Brand Guide） */
const initialBrandGuide = createBrandGuideAsset(DEFAULT_BRAND_GUIDE_CONTENT)
const initialAssets = new Map<AssetId, Asset>([[initialBrandGuide.id, initialBrandGuide]])
const initialTree = $AssetTree.addAssetRef(
  $AssetTree.create(),
  BRAND_GUIDE_FILENAME,
  ROOT_NODE_ID,
  BRAND_GUIDE_ASSET_ID
)

/** アセットストレージ */
const assets = shallowRef<Map<AssetId, Asset>>(initialAssets)
const tree = shallowRef<AssetTree>(initialTree)

/** 現在のフォルダID */
const currentFolderId = ref<NodeId>(ROOT_NODE_ID)

/** 選択中のノードID */
const selectedNodeId = ref<NodeId | null>(null)

export const usePaletteAssets = () => {
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

  /** アセットを直接追加（Blobから） */
  const addAsset = (asset: Asset) => {
    const newAssets = new Map(assets.value)
    newAssets.set(asset.id, asset)
    tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
    assets.value = newAssets
  }

  /** アセットを更新（既存のアセットのソースを更新） */
  const updateAsset = (assetId: AssetId, blob: Blob) => {
    const existing = assets.value.get(assetId)
    if (!existing) return

    const updated = $Asset.updateSource(existing, blob)
    const newAssets = new Map(assets.value)
    newAssets.set(assetId, updated)
    assets.value = newAssets
  }

  /** Brand Guideアセットを取得 */
  const getBrandGuideAsset = (): Asset | undefined => {
    return assets.value.get(BRAND_GUIDE_ASSET_ID)
  }

  /** Brand Guideの内容を更新 */
  const updateBrandGuide = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    updateAsset(BRAND_GUIDE_ASSET_ID, blob)
  }

  /** Brand Guideの内容を取得 */
  const getBrandGuideContent = async (): Promise<string> => {
    const asset = getBrandGuideAsset()
    if (!asset) return DEFAULT_BRAND_GUIDE_CONTENT
    const blob = await $Asset.toBlob(asset)
    return blob.text()
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
    addAsset,
    updateAsset,
    removeNode,
    renameNode,

    // Brand Guide specific
    getBrandGuideAsset,
    updateBrandGuide,
    getBrandGuideContent,
    BRAND_GUIDE_ASSET_ID,
  }
}
