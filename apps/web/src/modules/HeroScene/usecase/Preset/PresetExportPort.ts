/**
 * PresetExportPort
 *
 * プリセットのエクスポート（ファイルダウンロード）を抽象化するインターフェース
 * ブラウザAPIの副作用をInfra層に分離するためのPort
 */

import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

/**
 * プリセットエクスポートのポートインターフェース
 */
export interface PresetExportPort {
  /**
   * プリセットをJSONファイルとしてダウンロード
   * @param preset エクスポートするプリセット
   */
  downloadAsJson(preset: HeroViewPreset): void
}
