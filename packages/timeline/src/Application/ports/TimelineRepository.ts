/**
 * TimelineRepository - タイムラインデータへのアクセスを抽象化
 *
 * Observer pattern によるリアクティブな状態管理をサポート
 */

import type { Timeline } from '../../Timeline'
import type { Track } from '../../Track'
import type { Phase, LoopType } from '../../Phase'

export type TimelineSubscriber = (timeline: Timeline) => void
export type TimelineUnsubscribe = () => void

export interface TimelineRepository {
  /** 現在のTimelineを取得 */
  get(): Timeline

  /** Timelineを設定 */
  set(timeline: Timeline): void

  /** Timeline変更を購読 */
  subscribe(subscriber: TimelineSubscriber): TimelineUnsubscribe

  // ============================================================================
  // Track Operations
  // ============================================================================

  /** Trackを追加 */
  addTrack(track: Track): void

  /** Trackを更新 */
  updateTrack(trackId: string, updates: Partial<Track>): void

  /** Trackを削除 */
  removeTrack(trackId: string): void

  // ============================================================================
  // Phase Operations
  // ============================================================================

  /** Phaseを追加 */
  addPhase(phase: Phase): void

  /** Phaseを更新 */
  updatePhase(phaseId: string, updates: Partial<Phase>): void

  /** Phaseを削除 */
  removePhase(phaseId: string): void

  // ============================================================================
  // Loop Type
  // ============================================================================

  /** LoopTypeを設定 */
  setLoopType(loopType: LoopType): void
}
