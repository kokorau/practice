/**
 * useAssetRef - 特定アセットをリアクティブ Ref として使う composable
 *
 * AssetRepository の subscribe を Vue の ref でラップする。
 * 値の読み書きで自動的に Asset が更新される。
 */

import { ref, watch, onUnmounted, type Ref } from 'vue'
import type { Asset, AssetId } from '../../modules/Asset'
import { $Asset } from '../../modules/Asset'
import type { AssetRepository } from '../../modules/AssetRepository'
import { observeAssetUseCase } from '../../modules/AssetRepository'

/** useAssetRef のオプション */
export interface UseAssetRefOptions<T> {
  /** Blob から値をパースする関数 */
  parse: (text: string) => T
  /** 値を文字列にシリアライズする関数 */
  serialize: (value: T) => string
  /** アセットが存在しない場合のデフォルト値 */
  default: T
  /** MIME タイプ（デフォルト: application/json） */
  mimeType?: string
  /** アセット名（新規作成時に使用） */
  name?: string
}

/** useAssetRef の戻り値 */
export interface UseAssetRefReturn<T> {
  /** リアクティブな値 */
  value: Ref<T>
  /** アセットが存在するか */
  exists: Ref<boolean>
  /** 手動で値を更新 */
  update: (newValue: T) => void
}

/**
 * 特定アセットをリアクティブ Ref として使う
 *
 * @param repository - AssetRepository インスタンス
 * @param id - アセット ID
 * @param options - パース/シリアライズオプション
 */
export function useAssetRef<T>(
  repository: AssetRepository,
  id: AssetId,
  options: UseAssetRefOptions<T>
): UseAssetRefReturn<T> {
  const { parse, serialize, default: defaultValue, mimeType = 'application/json', name } = options

  const value = ref<T>(defaultValue) as Ref<T>
  const exists = ref(false)

  // 内部フラグ: 外部からの更新中は watch を無視
  let isExternalUpdate = false

  // Asset から値を読み取る
  const readAsset = async (asset: Asset | undefined) => {
    if (!asset) {
      isExternalUpdate = true
      value.value = defaultValue
      exists.value = false
      isExternalUpdate = false
      return
    }

    try {
      const blob = await $Asset.toBlob(asset)
      const text = await blob.text()
      isExternalUpdate = true
      value.value = parse(text)
      exists.value = true
      isExternalUpdate = false
    } catch {
      isExternalUpdate = true
      value.value = defaultValue
      exists.value = false
      isExternalUpdate = false
    }
  }

  // 値を Asset に書き込む
  const writeAsset = (newValue: T) => {
    const text = serialize(newValue)
    const blob = new Blob([text], { type: mimeType })

    const existing = repository.get(id)
    if (existing) {
      // 既存アセットを更新
      const updated = $Asset.updateSource(existing, blob)
      repository.set(id, updated)
    } else {
      // 新規アセットを作成
      const newAsset = $Asset.create({
        id,
        name: name ?? id,
        source: { type: 'blob', blob },
        meta: { mimeType },
      })
      repository.set(id, newAsset)
      exists.value = true
    }
  }

  // 購読開始
  const { current, unsubscribe } = observeAssetUseCase(repository, id, (asset) => {
    readAsset(asset)
  })

  // 初期値を読み込み
  readAsset(current)

  // 値の変更を監視して Asset に書き込み
  watch(
    value,
    (newValue) => {
      if (!isExternalUpdate) {
        writeAsset(newValue)
      }
    },
    { deep: true }
  )

  // クリーンアップ
  onUnmounted(() => {
    unsubscribe()
  })

  return {
    value,
    exists,
    update: writeAsset,
  }
}
