/**
 * useSiteBuilderAssets - SiteBuilder のアセット管理 composable
 *
 * useAssetManager の状態を使って、SiteBuilder 固有のアセット操作を提供する。
 */

import { ref, computed, watch } from 'vue'
import type { Asset } from '../../modules/Asset'
import { $Asset, $AssetSource } from '../../modules/Asset'
import { $AssetNode } from '../../modules/AssetRepository'
import { useAssetManager } from '../AssetManager'
import {
  // Brand Guide
  BRAND_GUIDE_ASSET_ID,
  // SiteConfig
  type SiteConfig,
  $SiteConfig,
  SITE_CONFIG_ASSET_ID,
  // FilterConfig
  type FilterConfig,
  $FilterConfig,
  FILTER_CONFIG_ASSET_ID,
  // SiteContents
  type SiteContents,
  $SiteContents,
  SITE_CONTENTS_ASSET_ID,
} from '../../modules/SiteBuilder'
import { DEFAULT_SITE_CONFIG } from '../../modules/SiteBuilder/Infra/MockData'

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

export function useSiteBuilderAssets() {
  // useAssetManager から状態と操作を取得
  const assetManager = useAssetManager()
  const {
    tree,
    assets,
    currentFolderId,
    currentFolder,
    currentNodes,
    currentPath,
    breadcrumbs,
    selectedNodeId,
    selectedAsset,
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
  } = assetManager

  // ============================================================
  // アセット取得・更新ヘルパー
  // ============================================================

  /** アセットを ID で取得 */
  const getAssetById = (assetId: string): Asset | undefined => {
    return assets.value.get(assetId as any)
  }

  /** アセットを更新（新しい Blob で） */
  const updateAssetContent = (assetId: string, blob: Blob) => {
    const existing = getAssetById(assetId)
    if (!existing) return

    const updated = $Asset.updateSource(existing, blob)
    const newAssets = new Map(assets.value)
    newAssets.set(assetId as any, updated)
    assets.value = newAssets
  }

  /** アセットの内容を文字列として取得 */
  const getAssetContent = async (assetId: string): Promise<string> => {
    const asset = getAssetById(assetId)
    if (!asset) return ''

    const source = asset.source
    if (source.type === 'blob') {
      return await source.blob.text()
    } else if (source.type === 'url') {
      const response = await fetch(source.url)
      return await response.text()
    }
    return ''
  }

  // ============================================================
  // Brand Guide 関連
  // ============================================================

  /** Brand Guideアセットを取得 */
  const getBrandGuideAsset = (): Asset | undefined => {
    return getAssetById(BRAND_GUIDE_ASSET_ID)
  }

  /** Brand Guideの内容を更新 */
  const updateBrandGuide = (content: string) => {
    const blob = new Blob([content], { type: 'text/markdown' })
    updateAssetContent(BRAND_GUIDE_ASSET_ID, blob)
  }

  /** Brand Guideの内容を取得 */
  const getBrandGuideContent = (): Promise<string> => {
    return getAssetContent(BRAND_GUIDE_ASSET_ID)
  }

  /** Brand Guide の変更を監視（watchベース） */
  const observeBrandGuide = (callback: (content: string) => void): (() => void) => {
    const stopWatch = watch(
      () => getAssetById(BRAND_GUIDE_ASSET_ID),
      async (asset) => {
        if (asset) {
          const content = await getAssetContent(BRAND_GUIDE_ASSET_ID)
          callback(content)
        }
      },
      { immediate: true }
    )
    return stopWatch
  }

  // ============================================================
  // SiteConfig 関連
  // ============================================================

  /** SiteConfig を更新 */
  const updateSiteConfig = (config: SiteConfig) => {
    const json = $SiteConfig.toJSON(config)
    const blob = new Blob([json], { type: 'application/json' })
    updateAssetContent(SITE_CONFIG_ASSET_ID, blob)
  }

  /** SiteConfig を取得 */
  const getSiteConfig = async (): Promise<SiteConfig> => {
    const content = await getAssetContent(SITE_CONFIG_ASSET_ID)
    return $SiteConfig.fromJSON(content, DEFAULT_SITE_CONFIG)
  }

  /** SiteConfig の変更を監視 */
  const observeSiteConfig = (callback: (config: SiteConfig) => void): (() => void) => {
    const stopWatch = watch(
      () => getAssetById(SITE_CONFIG_ASSET_ID),
      async (asset) => {
        if (asset) {
          const config = await getSiteConfig()
          callback(config)
        }
      },
      { immediate: true }
    )
    return stopWatch
  }

  // ============================================================
  // FilterConfig 関連
  // ============================================================

  /** FilterConfig を更新 */
  const updateFilterConfig = (config: FilterConfig) => {
    const json = $FilterConfig.toJSON(config)
    const blob = new Blob([json], { type: 'application/json' })
    updateAssetContent(FILTER_CONFIG_ASSET_ID, blob)
  }

  /** FilterConfig を取得 */
  const getFilterConfig = async (): Promise<FilterConfig> => {
    const content = await getAssetContent(FILTER_CONFIG_ASSET_ID)
    return $FilterConfig.fromJSON(content)
  }

  /** FilterConfig の変更を監視 */
  const observeFilterConfig = (callback: (config: FilterConfig) => void): (() => void) => {
    const stopWatch = watch(
      () => getAssetById(FILTER_CONFIG_ASSET_ID),
      async (asset) => {
        if (asset) {
          const config = await getFilterConfig()
          callback(config)
        }
      },
      { immediate: true }
    )
    return stopWatch
  }

  // ============================================================
  // SiteContents 関連
  // ============================================================

  /** SiteContents を更新 */
  const updateSiteContents = (contents: SiteContents) => {
    const json = $SiteContents.toJSON(contents)
    const blob = new Blob([json], { type: 'application/json' })
    updateAssetContent(SITE_CONTENTS_ASSET_ID, blob)
  }

  /** SiteContents を取得 */
  const getSiteContents = async (): Promise<SiteContents> => {
    const content = await getAssetContent(SITE_CONTENTS_ASSET_ID)
    return $SiteContents.fromJSON(content)
  }

  /** SiteContents の変更を監視 */
  const observeSiteContents = (callback: (contents: SiteContents) => void): (() => void) => {
    const stopWatch = watch(
      () => getAssetById(SITE_CONTENTS_ASSET_ID),
      async (asset) => {
        if (asset) {
          const contents = await getSiteContents()
          callback(contents)
        }
      },
      { immediate: true }
    )
    return stopWatch
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

    // State (from useAssetManager)
    tree,
    assets,
    currentFolderId,
    currentFolder,
    currentNodes,
    currentPath,
    breadcrumbs,
    selectedNodeId,
    selectedAsset,

    // Actions (from useAssetManager)
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
