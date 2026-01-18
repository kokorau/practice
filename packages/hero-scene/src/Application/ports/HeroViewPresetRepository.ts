/**
 * HeroViewPresetRepository Port
 *
 * プリセットデータへのアクセスを抽象化するインターフェース
 * 将来的なAPI移行を見据えた設計
 */

import type { HeroViewPreset } from '../../Domain/HeroViewPreset'

/**
 * HeroViewPresetのリポジトリインターフェース
 */
export interface HeroViewPresetRepository {
  /**
   * 全てのプリセットを取得
   */
  findAll(): Promise<HeroViewPreset[]>

  /**
   * IDでプリセットを取得
   * @param id プリセットID
   * @returns プリセット、見つからない場合はnull
   */
  findById(id: string): Promise<HeroViewPreset | null>
}
