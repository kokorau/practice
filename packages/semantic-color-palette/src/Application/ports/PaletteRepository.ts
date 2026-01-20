/**
 * PaletteRepository - パレットデータへのアクセスを抽象化
 *
 * Observer pattern によるリアクティブな状態管理をサポート
 */

import type { Palette } from '../../Domain/ValueObject/Palette'
import type { SeedColors } from '../../Domain/ValueObject/SeedColors'

export type PaletteSubscriber = (palette: Palette) => void
export type PaletteUnsubscribe = () => void

export interface PaletteRepository {
  /** 現在のPaletteを取得 */
  get(): Palette

  /** Paletteを設定 */
  set(palette: Palette): void

  /** Palette変更を購読 */
  subscribe(subscriber: PaletteSubscriber): PaletteUnsubscribe

  // ============================================================================
  // Partial Updates
  // ============================================================================

  /** SeedColorsを部分更新 */
  updateSeedColors(colors: Partial<SeedColors>): void
}
