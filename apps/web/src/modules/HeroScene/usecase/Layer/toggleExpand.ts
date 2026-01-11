/**
 * ToggleExpand UseCase
 *
 * グループレイヤーの展開/折りたたみ状態を切り替える
 *
 * NOTE: 現在のLayerNodeConfigにはexpandedプロパティがないため、
 * この操作はUI状態として別途管理する必要がある。
 * 将来的にGroupLayerNodeConfigにexpandedを追加する場合は、
 * このユースケースを更新する。
 */

import type { HeroViewRepository } from '../../Domain/repository/HeroViewRepository'
import type { GroupLayerNodeConfig } from '../../Domain/HeroViewConfig'

/**
 * グループレイヤーの展開/折りたたみ状態を切り替える
 *
 * NOTE: 現在は未実装（LayerNodeConfigにexpandedプロパティがないため）
 * UI状態として別途管理する必要がある
 *
 * @param _layerId - 対象レイヤーのID
 * @param _repository - HeroViewRepository
 * @returns 常にnull（未実装）
 */
export function toggleExpand(
  _layerId: string,
  _repository: HeroViewRepository
): boolean | null {
  // LayerNodeConfigにはexpandedプロパティがないため、
  // この操作はUI状態として別途管理する必要がある
  // 将来的にGroupLayerNodeConfigにexpandedを追加した場合:
  //
  // const config = repository.get()
  // const layer = config.layers.find((l) => l.id === layerId)
  // if (!layer || layer.type !== 'group') return null
  // const group = layer as GroupLayerNodeConfig
  // const newExpanded = !group.expanded
  // repository.updateLayer(layerId, { expanded: newExpanded })
  // return newExpanded

  return null
}

// Re-export type for documentation
export type { GroupLayerNodeConfig }
