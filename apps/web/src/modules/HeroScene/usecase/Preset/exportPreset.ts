/**
 * ExportPreset UseCase
 *
 * 現在のHeroView設定からプリセットデータを生成し、エクスポートする
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { HeroViewPreset, PresetColorConfig } from '../../Domain/HeroViewPreset'
import type { PresetExportPort } from './PresetExportPort'

/**
 * エクスポートするプリセットのオプション
 */
export interface ExportPresetOptions {
  /** プリセットID（省略時は自動生成） */
  id?: string
  /** プリセット名（省略時は 'Custom Preset'） */
  name?: string
  /**
   * カラープリセット（Brand/Accent/Foundation HSV values）
   * UI manages these via useSiteColors, so caller should provide them.
   */
  colorPreset?: PresetColorConfig
}

/**
 * 現在のHeroView設定からプリセットデータを生成する
 *
 * Note: colorPreset should be provided by the caller since brand/accent/foundation
 * HSV values are managed by the UI (useSiteColors), not stored in config.colors.
 *
 * @param repository - HeroViewRepository
 * @param options - エクスポートオプション
 * @returns 生成されたプリセット
 */
export function createPreset(
  repository: HeroViewRepository,
  options: ExportPresetOptions = {}
): HeroViewPreset {
  const config = repository.get()

  return {
    id: options.id ?? `custom-${Date.now()}`,
    name: options.name ?? 'Custom Preset',
    config,
    colorPreset: options.colorPreset,
  }
}

/**
 * 現在のHeroView設定からプリセットを生成し、ファイルとしてエクスポートする
 *
 * @param repository - HeroViewRepository
 * @param exportPort - PresetExportPort（ファイルダウンロード処理）
 * @param options - エクスポートオプション
 * @returns 生成されたプリセット
 */
export function exportPreset(
  repository: HeroViewRepository,
  exportPort: PresetExportPort,
  options: ExportPresetOptions = {}
): HeroViewPreset {
  const preset = createPreset(repository, options)
  exportPort.downloadAsJson(preset)
  return preset
}
