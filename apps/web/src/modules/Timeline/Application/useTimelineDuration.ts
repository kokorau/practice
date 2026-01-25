import { ref, type Ref } from 'vue'
import type { Ms } from '@practice/timeline'

/**
 * Usecase: タイムラインの表示時間を管理する
 *
 * - 表示時間（visibleDuration）の状態を保持
 * - 表示時間の更新ロジックを提供
 */
export function useTimelineDuration(initialDuration: Ms = 30000 as Ms) {
  const visibleDuration: Ref<Ms> = ref(initialDuration)

  /**
   * 表示時間を更新する
   * @param newDuration 新しい表示時間（ミリ秒）
   */
  function setVisibleDuration(newDuration: Ms): void {
    // 最小1秒、最大10分の制限
    const minMs = 1000
    const maxMs = 600000
    const clamped = Math.max(minMs, Math.min(maxMs, newDuration)) as Ms
    visibleDuration.value = clamped
  }

  /**
   * 秒数から表示時間を設定する
   * @param seconds 秒数
   */
  function setVisibleDurationSeconds(seconds: number): void {
    setVisibleDuration((seconds * 1000) as Ms)
  }

  return {
    visibleDuration,
    setVisibleDuration,
    setVisibleDurationSeconds,
  }
}
