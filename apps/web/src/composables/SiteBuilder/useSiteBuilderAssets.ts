/**
 * useSiteBuilderAssets - SiteBuilder のアセット管理 composable
 *
 * AssetRepository と UseCase を使って、アセットの CRUD と監視を行う。
 * Vue のリアクティブシステムと統合。
 */

import { ref, shallowRef, computed, watch } from 'vue'
import type { Asset, AssetId } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'
import type { AssetTree, NodeId, AssetNode, FolderNode } from '../../modules/AssetRepository'
import { $AssetTree, ROOT_NODE_ID, $AssetNode } from '../../modules/AssetRepository'
import {
  getSiteBuilderRepository,
  initializeSiteBuilderUseCase,
  // Brand Guide
  updateBrandGuideUseCase,
  getBrandGuideContentUseCase,
  observeBrandGuideUseCase,
  BRAND_GUIDE_ASSET_ID,
  // SiteConfig
  type SiteConfig,
  updateSiteConfigUseCase,
  getSiteConfigUseCase,
  observeSiteConfigUseCase,
  SITE_CONFIG_ASSET_ID,
  // FilterConfig
  type FilterConfig,
  updateFilterConfigUseCase,
  getFilterConfigUseCase,
  observeFilterConfigUseCase,
  FILTER_CONFIG_ASSET_ID,
  // SiteContents
  type SiteContents,
  updateSiteContentsUseCase,
  getSiteContentsUseCase,
  observeSiteContentsUseCase,
  SITE_CONTENTS_ASSET_ID,
} from '../../modules/SiteBuilder'

/** アセットツリーの状態（将来的にこれも AssetRepository で管理する可能性あり） */
const tree = shallowRef<AssetTree>($AssetTree.create())

/** アセットマップの状態（Repository の変更を反映するためのリアクティブな Map） */
const assetsMap = shallowRef<Map<AssetId, Asset>>(new Map())

/** 現在のフォルダID */
const currentFolderId = ref<NodeId>(ROOT_NODE_ID)

/** 選択中のノードID */
const selectedNodeId = ref<NodeId | null>(null)

/** 選択中のアセット（リアクティブ用） */
const selectedAssetRef = shallowRef<Asset | null>(null)

/** 選択中アセットの購読解除関数 */
let selectedAssetUnsubscribe: (() => void) | null = null

/** 初期化済みフラグ（同期的な Repository 初期化） */
let initialized = false

/** 初期データロード完了フラグ（リアクティブ） */
const isLoaded = ref(false)

/** 初期データロード中フラグ */
let isLoading = false

/** ロード済みの初期データをキャッシュ */
type InitialData = {
  siteConfig: SiteConfig
  filterConfig: FilterConfig
  siteContents: SiteContents
  brandGuideContent: string
}
let cachedInitialData: InitialData | null = null

/** assetsMap を更新するヘルパー */
const refreshAssetsMap = (repository: import('../../modules/AssetRepository').AssetRepository) => {
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

    // ============================================================
    // フォルダ構造の初期化
    // ============================================================

    // 1. config/ フォルダを作成し、設定ファイルを配置
    tree.value = $AssetTree.addFolder(tree.value, 'config', ROOT_NODE_ID)
    const configFolder = $AssetTree.getChildren(tree.value, ROOT_NODE_ID).find(
      (node) => $AssetNode.isFolder(node) && node.name === 'config'
    )
    const configFolderId = configFolder?.id ?? ROOT_NODE_ID

    tree.value = $AssetTree.addAssetRef(tree.value, 'brand-guide.md', configFolderId, BRAND_GUIDE_ASSET_ID)
    tree.value = $AssetTree.addAssetRef(tree.value, 'site-config.json', configFolderId, SITE_CONFIG_ASSET_ID)
    tree.value = $AssetTree.addAssetRef(tree.value, 'filter-config.json', configFolderId, FILTER_CONFIG_ASSET_ID)
    tree.value = $AssetTree.addAssetRef(tree.value, 'site-contents.json', configFolderId, SITE_CONTENTS_ASSET_ID)

    // 2. assets/ フォルダを作成（サブフォルダ付き）
    tree.value = $AssetTree.addFolder(tree.value, 'assets', ROOT_NODE_ID)
    const assetsFolder = $AssetTree.getChildren(tree.value, ROOT_NODE_ID).find(
      (node) => $AssetNode.isFolder(node) && node.name === 'assets'
    )
    const assetsFolderId = assetsFolder?.id ?? ROOT_NODE_ID

    tree.value = $AssetTree.addFolder(tree.value, 'images', assetsFolderId)
    tree.value = $AssetTree.addFolder(tree.value, 'icons', assetsFolderId)
    tree.value = $AssetTree.addFolder(tree.value, 'fonts', assetsFolderId)
    tree.value = $AssetTree.addFolder(tree.value, 'documents', assetsFolderId)

    // 3. dist/ フォルダを作成（ビルド出力用）
    tree.value = $AssetTree.addFolder(tree.value, 'dist', ROOT_NODE_ID)

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

  /** 選択中のアセットを取得（リアクティブに購読） */
  const selectedAsset = computed<Asset | null>(() => selectedAssetRef.value)

  /**
   * 選択中のノードIDが変わったら、対応するアセットを購読する
   */
  const setupSelectedAssetSubscription = () => {
    // 既存の購読を解除
    if (selectedAssetUnsubscribe) {
      selectedAssetUnsubscribe()
      selectedAssetUnsubscribe = null
    }

    if (!selectedNodeId.value) {
      selectedAssetRef.value = null
      return
    }

    const node = $AssetTree.getNode(tree.value, selectedNodeId.value)
    if (!node || !$AssetNode.isAssetRef(node)) {
      selectedAssetRef.value = null
      return
    }

    // 初期値を設定
    selectedAssetRef.value = repository.get(node.assetId) ?? null

    // 変更を購読
    selectedAssetUnsubscribe = repository.subscribe(node.assetId, (asset) => {
      selectedAssetRef.value = asset ?? null
    })
  }

  // selectedNodeId の変更を監視して購読を設定
  watch(selectedNodeId, setupSelectedAssetSubscription, { immediate: true })

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

  // ============================================================
  // SiteConfig 関連
  // ============================================================

  /** SiteConfig を更新 */
  const updateSiteConfig = (config: SiteConfig) => {
    updateSiteConfigUseCase(repository, config)
    refreshAssetsMap(repository)
  }

  /** SiteConfig を取得 */
  const getSiteConfig = (): Promise<SiteConfig> => {
    return getSiteConfigUseCase(repository)
  }

  /** SiteConfig の変更を監視 */
  const observeSiteConfig = (callback: (config: SiteConfig) => void) => {
    return observeSiteConfigUseCase(repository, callback)
  }

  // ============================================================
  // FilterConfig 関連
  // ============================================================

  /** FilterConfig を更新 */
  const updateFilterConfig = (config: FilterConfig) => {
    updateFilterConfigUseCase(repository, config)
    refreshAssetsMap(repository)
  }

  /** FilterConfig を取得 */
  const getFilterConfig = (): Promise<FilterConfig> => {
    return getFilterConfigUseCase(repository)
  }

  /** FilterConfig の変更を監視 */
  const observeFilterConfig = (callback: (config: FilterConfig) => void) => {
    return observeFilterConfigUseCase(repository, callback)
  }

  // ============================================================
  // SiteContents 関連
  // ============================================================

  /** SiteContents を更新 */
  const updateSiteContents = (contents: SiteContents) => {
    updateSiteContentsUseCase(repository, contents)
    refreshAssetsMap(repository)
  }

  /** SiteContents を取得 */
  const getSiteContents = (): Promise<SiteContents> => {
    return getSiteContentsUseCase(repository)
  }

  /** SiteContents の変更を監視 */
  const observeSiteContents = (callback: (contents: SiteContents) => void) => {
    return observeSiteContentsUseCase(repository, callback)
  }

  // ============================================================
  // 一括ロード（初期化）
  // ============================================================

  /**
   * 全ての初期データを一括でロードする
   *
   * View側で loading 状態を管理し、ロード完了後にデータを使用できるようにする。
   * 既にロード済みの場合はキャッシュを返す。
   */
  const loadInitialData = async (): Promise<InitialData> => {
    // 既にロード済みならキャッシュを返す
    if (cachedInitialData) {
      return cachedInitialData
    }

    // ロード中なら待機（競合防止）
    if (isLoading) {
      // 簡易的なポーリングで待機
      await new Promise<void>((resolve) => {
        const check = () => {
          if (cachedInitialData) {
            resolve()
          } else {
            setTimeout(check, 10)
          }
        }
        check()
      })
      return cachedInitialData!
    }

    isLoading = true

    try {
      // 並列でロード
      const [siteConfig, filterConfig, siteContents, brandGuideContent] = await Promise.all([
        getSiteConfig(),
        getFilterConfig(),
        getSiteContents(),
        getBrandGuideContent(),
      ])

      cachedInitialData = {
        siteConfig,
        filterConfig,
        siteContents,
        brandGuideContent,
      }

      isLoaded.value = true
      return cachedInitialData
    } finally {
      isLoading = false
    }
  }

  return {
    // Initialization State
    isLoaded,
    loadInitialData,

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

    // SiteConfig
    updateSiteConfig,
    getSiteConfig,
    observeSiteConfig,
    SITE_CONFIG_ASSET_ID,

    // FilterConfig
    updateFilterConfig,
    getFilterConfig,
    observeFilterConfig,
    FILTER_CONFIG_ASSET_ID,

    // SiteContents
    updateSiteContents,
    getSiteContents,
    observeSiteContents,
    SITE_CONTENTS_ASSET_ID,
  }
}
