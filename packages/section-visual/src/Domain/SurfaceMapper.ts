/**
 * SurfaceMapper
 *
 * SurfaceConfig と CustomSurfaceParams/CustomBackgroundSurfaceParams の相互変換を行うドメインロジック
 *
 * スキーマベースの動的マッピングにより、新しいサーフェスタイプ追加時の変更箇所を最小化。
 * SurfaceSchemas に登録されているタイプは自動的にマッピングされる。
 */

import { SurfaceSchemas } from '@practice/texture'
import type { SurfaceConfig } from './HeroViewConfig'
import type { CustomSurfaceParams, CustomBackgroundSurfaceParams } from '../types/HeroSceneState'

/**
 * スキーマに登録されているサーフェスタイプのセット
 */
const SCHEMA_SURFACE_TYPES = new Set(Object.keys(SurfaceSchemas))

/**
 * SurfaceConfig を CustomSurfaceParams に変換する
 *
 * スキーマベースの動的マッピング:
 * - スキーマに登録されているタイプはそのまま通過
 * - 残りのパラメータはそのままコピー
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @returns CustomSurfaceParams (UI state)
 */
export function toCustomSurfaceParams(config: SurfaceConfig): CustomSurfaceParams {
  const { id, ...params } = config

  // スキーマに登録されていないタイプ（例: 'image'）はsolidにfallback
  if (!SCHEMA_SURFACE_TYPES.has(id)) {
    return { id: 'solid' }
  }

  return { id, ...params } as CustomSurfaceParams
}

/**
 * CustomSurfaceParams を SurfaceConfig に変換する (逆変換)
 *
 * スキーマベースの動的マッピング:
 * - スキーマに登録されているタイプはそのまま通過
 * - 残りのパラメータはそのままコピー
 *
 * @param params - CustomSurfaceParams (UI state)
 * @returns SurfaceConfig (JSON serializable)
 */
export function fromCustomSurfaceParams(params: CustomSurfaceParams): SurfaceConfig {
  const { id, ...rest } = params

  // スキーマに登録されていないタイプはsolidにfallback
  if (!SCHEMA_SURFACE_TYPES.has(id)) {
    return { id: 'solid' }
  }

  return { id, ...rest } as SurfaceConfig
}

/**
 * SurfaceConfig を CustomBackgroundSurfaceParams に変換する
 *
 * @param config - SurfaceConfig (JSON serializable)
 * @returns CustomBackgroundSurfaceParams (UI state)
 */
export function toCustomBackgroundSurfaceParams(config: SurfaceConfig): CustomBackgroundSurfaceParams {
  // CustomBackgroundSurfaceParams has the same structure as CustomSurfaceParams
  return toCustomSurfaceParams(config) as CustomBackgroundSurfaceParams
}
