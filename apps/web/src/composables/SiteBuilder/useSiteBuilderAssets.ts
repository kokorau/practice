/**
 * useSiteBuilderAssets - SiteBuilder のアセット管理 composable
 *
 * AssetRepository と UseCase を使って、アセットの CRUD と監視を行う。
 * Vue のリアクティブシステムと統合。
 */

import { ref, shallowRef, computed, onMounted, onUnmounted } from 'vue'
import type { Asset, AssetId } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'
import type { AssetTree, NodeId, AssetNode, FolderNode } from '../../modules/AssetManager'
import { $AssetTree, ROOT_NODE_ID, $AssetNode } from '../../modules/AssetManager'
import {
  getSiteBuilderRepository,
  initializeSiteBuilderUseCase,
  updateBrandGuideUseCase,
  getBrandGuideContentUseCase,
  observeBrandGuideUseCase,
  BRAND_GUIDE_ASSET_ID,
} from '../../modules/SiteBuilder'

/** アセットツリーの状態（将来的にこれも AssetRepository で管理する可能性あり） */
const tree = shallowRef<AssetTree>($AssetTree.create())

/** アセットマップの状態（Repository の変更を反映するためのリアクティブな Map） */
const assetsMap = shallowRef<Map<AssetId, Asset>>(new Map())

/** 現在のフォルダID */
const currentFolderId = ref<NodeId>(ROOT_NODE_ID)

/** 選択中のノードID */
const selectedNodeId = ref<NodeId | null>(null)

/** 初期化済みフラグ */
let initialized = false

/** assetsMap を更新するヘルパー */
const refreshAssetsMap = (repository: import('../../modules/AssetManager').AssetRepository) => {
  // ツリー内の全アセット参照を取得して Map を再構築
  const allRefs = $AssetTree.getAllAssetRefs(tree.value)
  const newMap = new Map<AssetId, Asset>()
  for (const ref of allRefs) {
    const asset = repository.get(ref.assetId)
    if (asset) {
      newMap.set(ref.assetId, asset)
    }
  }
  assetsMap.value = newMap
}

export function useSiteBuilderAssets() {
  const repository = getSiteBuilderRepository()

  // 初期化（一度だけ実行）
  if (!initialized) {
    initializeSiteBuilderUseCase(repository)
    // ツリーに Brand Guide を追加
    tree.value = $AssetTree.addAssetRef(tree.value, 'brand-guide.md', ROOT_NODE_ID, BRAND_GUIDE_ASSET_ID)
    // assetsMap を初期化
    refreshAssetsMap(repository)
    initialized = true
  }

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
      return repository.get(node.assetId)
    }
    return undefined
  }

  /** 選択中のアセットを取得 */
  const selectedAsset = computed<Asset | null>(() => {
    if (!selectedNodeId.value) return null
    const node = $AssetTree.getNode(tree.value, selectedNodeId.value)
    if (!node || !$AssetNode.isAssetRef(node)) return null
    return repository.get(node.assetId) ?? null
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

    for (const file of fileArray) {
      const asset = $Asset.fromFile(file)
      repository.set(asset.id, asset)
      tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
    }
    refreshAssetsMap(repository)
  }

  /** File System Access APIでファイルを選択して追加（ルートに追加） */
  const pickFiles = async () => {
    try {
      const handles = await (window as any).showOpenFilePicker({
        multiple: true,
      })

      for (const handle of handles) {
        const asset = await $Asset.fromFileHandle(handle)
        repository.set(asset.id, asset)
        tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
      }
      refreshAssetsMap(repository)
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
    repository.set(asset.id, asset)
    tree.value = $AssetTree.addAssetRef(tree.value, asset.name, ROOT_NODE_ID, asset.id)
    refreshAssetsMap(repository)
  }

  /** アセットを更新（既存のアセットのソースを更新） */
  const updateAsset = (assetId: AssetId, blob: Blob) => {
    const existing = repository.get(assetId)
    if (!existing) return

    const updated = $Asset.updateSource(existing, blob)
    repository.set(assetId, updated)
    refreshAssetsMap(repository)
  }

  /** ノードを削除 */
  const removeNode = (nodeId: NodeId) => {
    const node = $AssetTree.getNode(tree.value, nodeId)
    if (!node) return

    // アセット参照の場合、アセット本体も削除
    if ($AssetNode.isAssetRef(node)) {
      repository.delete(node.assetId)
    }

    tree.value = $AssetTree.removeNode(tree.value, nodeId)
    refreshAssetsMap(repository)
  }

  /** ノードをリネーム */
  const renameNode = (nodeId: NodeId, name: string) => {
    tree.value = $AssetTree.renameNode(tree.value, nodeId, name)
  }

  // ============================================================
  // Brand Guide 関連
  // ============================================================

  /** Brand Guideアセットを取得 */
  const getBrandGuideAsset = (): Asset | undefined => {
    return repository.get(BRAND_GUIDE_ASSET_ID)
  }

  /** Brand Guideの内容を更新 */
  const updateBrandGuide = (content: string) => {
    updateBrandGuideUseCase(repository, content)
  }

  /** Brand Guideの内容を取得 */
  const getBrandGuideContent = (): Promise<string> => {
    return getBrandGuideContentUseCase(repository)
  }

  /** Brand Guide の変更を監視 */
  const observeBrandGuide = (callback: (content: string) => void) => {
    return observeBrandGuideUseCase(repository, callback)
  }

  return {
    // State
    tree,
    assets: assetsMap,
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
    observeBrandGuide,
    BRAND_GUIDE_ASSET_ID,
  }
}
