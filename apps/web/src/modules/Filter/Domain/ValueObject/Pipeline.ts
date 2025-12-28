/**
 * Pipeline - LUTベースの画像処理パイプライン
 *
 * 複数のStageを順次適用し、最終的に1つのLUTに合成する。
 * 各Stageは image → image の変換を表し、中間結果の可視化が可能。
 */

import type { Lut, Lut1D } from './Lut'
import { $Lut1D } from './Lut1D'
import { $Lut3D } from './Lut3D'

/**
 * パイプラインの1ステージ
 * 各ステージは単一のLUT変換を持つ
 */
export type Stage = {
  /** 一意のID */
  id: string
  /** 表示名 */
  name: string
  /** 有効/無効 */
  enabled: boolean
  /** LUT (1D or 3D) */
  lut: Lut
  /** 適用強度 (0.0 - 1.0) */
  intensity: number
}

/**
 * パイプライン全体
 * Stageの順序付き配列
 */
export type Pipeline = {
  stages: Stage[]
}

export const $Stage = {
  /**
   * Stageを作成
   */
  create: (
    id: string,
    name: string,
    lut: Lut,
    options?: { enabled?: boolean; intensity?: number }
  ): Stage => ({
    id,
    name,
    enabled: options?.enabled ?? true,
    lut,
    intensity: options?.intensity ?? 1.0,
  }),

  /**
   * Stageの有効LUTを取得（強度適用済み）
   */
  getEffectiveLut: (stage: Stage): Lut | null => {
    if (!stage.enabled) return null

    if (stage.intensity >= 0.999) {
      return stage.lut
    }

    // 強度に応じてIdentityとブレンド
    if ($Lut1D.is(stage.lut)) {
      return $Lut1D.blend(stage.lut, stage.intensity)
    } else {
      return $Lut3D.blend(stage.lut, stage.intensity)
    }
  },
}

export const $Pipeline = {
  /**
   * 空のパイプラインを作成
   */
  empty: (): Pipeline => ({
    stages: [],
  }),

  /**
   * Stageを追加
   */
  addStage: (pipeline: Pipeline, stage: Stage): Pipeline => ({
    stages: [...pipeline.stages, stage],
  }),

  /**
   * Stageを削除
   */
  removeStage: (pipeline: Pipeline, stageId: string): Pipeline => ({
    stages: pipeline.stages.filter((s) => s.id !== stageId),
  }),

  /**
   * Stageを更新
   */
  updateStage: (
    pipeline: Pipeline,
    stageId: string,
    update: Partial<Omit<Stage, 'id'>>
  ): Pipeline => ({
    stages: pipeline.stages.map((s) =>
      s.id === stageId ? { ...s, ...update } : s
    ),
  }),

  /**
   * Stageの順序を変更
   */
  reorderStages: (pipeline: Pipeline, stageIds: string[]): Pipeline => {
    const stageMap = new Map(pipeline.stages.map((s) => [s.id, s]))
    const reordered = stageIds
      .map((id) => stageMap.get(id))
      .filter((s): s is Stage => s !== undefined)
    return { stages: reordered }
  },

  /**
   * 有効なステージのみ取得
   */
  getEnabledStages: (pipeline: Pipeline): Stage[] =>
    pipeline.stages.filter((s) => s.enabled),

  /**
   * パイプライン全体を1つのLut1Dに合成
   * 注意: 3D LUTが含まれる場合は1Dに変換される（精度低下の可能性）
   */
  compose: (pipeline: Pipeline): Lut1D => {
    const enabledStages = $Pipeline.getEnabledStages(pipeline)

    if (enabledStages.length === 0) {
      return $Lut1D.identity()
    }

    // 各ステージの有効LUTを取得（強度適用済み）
    const luts: Lut1D[] = []
    for (const stage of enabledStages) {
      const effectiveLut = $Stage.getEffectiveLut(stage)
      if (!effectiveLut) continue

      // 3D LUTは1Dに変換（チャンネル独立として扱う）
      if ($Lut1D.is(effectiveLut)) {
        luts.push(effectiveLut)
      } else {
        // 3D → 1D 変換（対角線上の値を使用）
        luts.push($Lut3D.toLut1D(effectiveLut))
      }
    }

    return $Lut1D.compose(...luts)
  },

  /**
   * 指定ステージまでの中間結果LUTを取得
   * @param pipeline パイプライン
   * @param upToStageId このステージまで（含む）を合成
   */
  composeUpTo: (pipeline: Pipeline, upToStageId: string): Lut1D => {
    const stages = pipeline.stages
    const targetIndex = stages.findIndex((s) => s.id === upToStageId)

    if (targetIndex === -1) {
      return $Lut1D.identity()
    }

    const partialPipeline: Pipeline = {
      stages: stages.slice(0, targetIndex + 1),
    }

    return $Pipeline.compose(partialPipeline)
  },

  /**
   * 各ステージの中間結果LUTを全て取得
   * @returns Map<stageId, Lut1D> - 各ステージ適用後のLUT
   */
  getIntermediateLuts: (pipeline: Pipeline): Map<string, Lut1D> => {
    const result = new Map<string, Lut1D>()

    for (const stage of pipeline.stages) {
      result.set(stage.id, $Pipeline.composeUpTo(pipeline, stage.id))
    }

    return result
  },
}
