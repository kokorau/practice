/**
 * InMemoryHeroViewPresetRepository
 *
 * JSONファイルからプリセットデータを読み込む
 * エクスポート機能で生成したJSONをpresetsフォルダに追加可能
 */

import type { HeroViewPresetRepository } from '../Application/ports/HeroViewPresetRepository'
import type { HeroViewPreset } from '../Domain/HeroViewPreset'

// Import preset JSON files
import corporateClean from './presets/corporate-clean.json'
import creativeStudio from './presets/creative-studio.json'
import techStartup from './presets/tech-startup.json'
import fashionEditorial from './presets/fashion-editorial.json'
import retroPop from './presets/retro-pop.json'
import minimalZen from './presets/minimal-zen.json'
import boldStatement from './presets/bold-statement.json'
// Test presets for step-by-step verification
import testLevel1BgOnly from './presets/test-level1-bg-only.json'
import testLevel2BgSurface from './presets/test-level2-bg-surface.json'
import testLevel3WithMask from './presets/test-level3-with-mask.json'
import testLevel4MultiMask from './presets/test-level4-multi-mask.json'
import testLevel6MaskWithEffect from './presets/test-level6-mask-with-effect.json'
import testLevel7MultiMaskWithEffects from './presets/test-level7-multi-mask-with-effects.json'
import testLevel8WithText from './presets/test-level8-with-text.json'

// ============================================================
// Preset Data
// ============================================================

// Note: JSON presets may use legacy format (colors.background/mask).
// These are migrated when applied via migrateHeroViewConfig().
const PRESETS: HeroViewPreset[] = [
  // Test presets (first for easy access during debugging)
  testLevel8WithText as unknown as HeroViewPreset,
  testLevel1BgOnly as unknown as HeroViewPreset,
  testLevel2BgSurface as unknown as HeroViewPreset,
  testLevel3WithMask as unknown as HeroViewPreset,
  testLevel4MultiMask as unknown as HeroViewPreset,
  testLevel6MaskWithEffect as unknown as HeroViewPreset,
  testLevel7MultiMaskWithEffects as unknown as HeroViewPreset,
  // Production presets
  corporateClean as unknown as HeroViewPreset,
  creativeStudio as unknown as HeroViewPreset,
  techStartup as unknown as HeroViewPreset,
  fashionEditorial as unknown as HeroViewPreset,
  retroPop as unknown as HeroViewPreset,
  minimalZen as unknown as HeroViewPreset,
  boldStatement as unknown as HeroViewPreset,
]

// ============================================================
// Repository Implementation
// ============================================================

/**
 * インメモリプリセットリポジトリを作成
 */
export const createInMemoryHeroViewPresetRepository = (): HeroViewPresetRepository => ({
  findAll: async () => PRESETS,
  findById: async (id: string) => PRESETS.find((p) => p.id === id) ?? null,
})
