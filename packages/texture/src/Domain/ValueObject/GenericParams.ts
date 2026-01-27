/**
 * Generic Parameters
 *
 * あらゆるパラメータ化アイテムの共通型
 * Surface, Mask, Effect, Group(Compositor) 全てで使用
 *
 * 設計方針:
 * - スキーマは静的に感知不可能として扱う（将来のDB移行を見据える）
 * - ランタイムバリデーションで型安全性を担保
 */

/**
 * あらゆるパラメータ化アイテムの共通型
 * `id` フィールドでパラメータ種別を識別
 */
export interface GenericParams {
  id: string
  [key: string]: unknown
}

/**
 * プリセット共通型
 * label と params を持つ再利用可能な設定
 */
export interface Preset<T extends GenericParams = GenericParams> {
  label: string
  params: T
}
