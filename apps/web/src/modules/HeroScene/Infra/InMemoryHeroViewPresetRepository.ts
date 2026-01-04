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

// ============================================================
// Preset Data
// ============================================================

const PRESETS: HeroViewPreset[] = [
  corporateClean as HeroViewPreset,
  creativeStudio as HeroViewPreset,
  techStartup as HeroViewPreset,
  fashionEditorial as HeroViewPreset,
  retroPop as HeroViewPreset,
  minimalZen as HeroViewPreset,
  boldStatement as HeroViewPreset,
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
