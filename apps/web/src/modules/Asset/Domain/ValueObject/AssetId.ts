/**
 * AssetId - アセットの一意識別子
 */

export type AssetId = string & { readonly __brand: 'AssetId' }

let assetIdCounter = 0

export const $AssetId = {
  /** 新しいAssetIdを生成 */
  generate: (): AssetId => {
    const timestamp = Date.now().toString(36)
    const counter = (++assetIdCounter).toString(36).padStart(4, '0')
    const random = Math.random().toString(36).substring(2, 6)
    return `asset_${timestamp}_${counter}_${random}` as AssetId
  },

  /** 文字列からAssetIdを作成（バリデーションなし） */
  fromString: (value: string): AssetId => value as AssetId,

  /** AssetIdかどうかを判定 */
  isValid: (value: string): value is AssetId => {
    return typeof value === 'string' && value.startsWith('asset_')
  },
}
