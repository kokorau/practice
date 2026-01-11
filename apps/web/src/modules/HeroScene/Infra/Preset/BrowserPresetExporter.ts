/**
 * BrowserPresetExporter
 *
 * ブラウザAPIを使用したプリセットエクスポートの実装
 * Blob生成とファイルダウンロードを行う
 */

import type { PresetExportPort } from '../../usecase/Preset/PresetExportPort'
import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

/**
 * ブラウザAPIを使用したPresetExportPortの実装を作成
 */
export function createBrowserPresetExporter(): PresetExportPort {
  return {
    downloadAsJson(preset: HeroViewPreset): void {
      const json = JSON.stringify(preset, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)

      const a = document.createElement('a')
      a.href = url
      a.download = `hero-preset-${Date.now()}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)

      URL.revokeObjectURL(url)
    },
  }
}
