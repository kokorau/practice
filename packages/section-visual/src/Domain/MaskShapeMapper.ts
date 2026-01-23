/**
 * MaskShapeMapper
 *
 * MaskShapeConfig と CustomMaskShapeParams の相互変換を行うドメインロジック
 *
 * スキーマベースの動的マッピングにより、新しいマスクシェイプ追加時の変更箇所を最小化。
 * MaskShapeSchemas に登録されているタイプは自動的にマッピングされる。
 */

import { MaskShapeSchemas, getDefaults } from '@practice/texture'
import type { MaskShapeConfig as TextureMaskShapeConfig } from '@practice/texture'
import type { MaskShapeConfig as HeroMaskShapeConfig } from './HeroViewConfig'
import type { CustomMaskShapeParams } from '../types/HeroSceneState'

/**
 * Input type for toCustomMaskShapeParams
 * Accepts both @practice/texture MaskShapeConfig (cutout optional) and
 * HeroViewConfig MaskShapeConfig (cutout required)
 */
type MaskShapeConfigInput = TextureMaskShapeConfig | HeroMaskShapeConfig

/**
 * スキーマに登録されているマスクシェイプタイプのセット
 */
const SCHEMA_MASK_TYPES = new Set(Object.keys(MaskShapeSchemas))

/**
 * スキーマからデフォルト値を取得するヘルパー
 */
function getDefaultsForType(type: string): Record<string, unknown> {
  const schema = MaskShapeSchemas[type as keyof typeof MaskShapeSchemas]
  if (!schema) return {}
  return getDefaults(schema)
}

/**
 * MaskShapeConfig を CustomMaskShapeParams に変換する
 *
 * スキーマベースの動的マッピング:
 * - `type` フィールドを `id` にリネーム
 * - 残りのパラメータはそのままコピー
 * - 未定義のパラメータはスキーマのデフォルト値で補完
 *
 * @param maskConfig - MaskShapeConfig (from @practice/texture or HeroViewConfig)
 * @returns CustomMaskShapeParams (UI state)
 */
export function toCustomMaskShapeParams(maskConfig: MaskShapeConfigInput): CustomMaskShapeParams {
  const { type, ...params } = maskConfig

  // スキーマに登録されていないタイプはblobにfallback
  if (!SCHEMA_MASK_TYPES.has(type)) {
    const blobDefaults = getDefaultsForType('blob')
    return { id: 'blob', ...blobDefaults } as CustomMaskShapeParams
  }

  // スキーマのデフォルト値を取得し、入力パラメータでオーバーライド
  const defaults = getDefaultsForType(type)
  const mergedParams = { ...defaults, ...params }

  return { id: type, ...mergedParams } as CustomMaskShapeParams
}

/**
 * CustomMaskShapeParams を MaskShapeConfig に変換する (逆変換)
 *
 * スキーマベースの動的マッピング:
 * - `id` フィールドを `type` にリネーム
 * - 残りのパラメータはそのままコピー
 *
 * @param params - CustomMaskShapeParams (UI state)
 * @returns MaskShapeConfig (JSON serializable)
 */
export function fromCustomMaskShapeParams(params: CustomMaskShapeParams): HeroMaskShapeConfig {
  const { id, ...rest } = params

  // スキーマに登録されていないタイプはblobにfallback
  if (!SCHEMA_MASK_TYPES.has(id)) {
    const blobDefaults = getDefaultsForType('blob')
    return { type: 'blob', ...blobDefaults } as HeroMaskShapeConfig
  }

  return { type: id, ...rest } as HeroMaskShapeConfig
}
