/**
 * Timeline Presets
 *
 * HeroViewPreset形式のタイムライン対応プリセット
 * ANIMATED_PRESETSをHeroViewPreset形式に変換
 */

import type { HeroViewPreset } from '@practice/section-visual'
import { ANIMATED_PRESETS } from './animatedHeroData'

/**
 * ANIMATED_PRESETSをHeroViewPreset形式に変換
 */
export const TIMELINE_PRESETS: HeroViewPreset[] = ANIMATED_PRESETS.map((animated) => ({
  id: animated.id,
  name: animated.name,
  description: animated.description,
  colorPreset: animated.colorPreset,
  timeline: animated.timeline,
  createConfig: animated.createConfig,
}))

/**
 * Timeline用のプリセットリポジトリを作成
 */
export { TIMELINE_PRESETS as default }
