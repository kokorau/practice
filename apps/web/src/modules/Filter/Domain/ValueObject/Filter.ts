/**
 * Filter - カーブベースのフィルター定義
 */

import { type Curve, $Curve } from './Curve'
import { type Lut, $Lut } from './Lut'

export type Filter = {
  /** Master カーブ (RGB共通) */
  master: Curve
  /** 個別チャンネル (将来用、nullの場合はMasterのみ使用) */
  r: Curve | null
  g: Curve | null
  b: Curve | null
}

export const $Filter = {
  /** デフォルトフィルター (無変換) */
  identity: (pointCount: number = 7): Filter => ({
    master: $Curve.identity(pointCount),
    r: null,
    g: null,
    b: null,
  }),

  /** Masterカーブのみ設定 */
  fromMaster: (master: Curve): Filter => ({
    master,
    r: null,
    g: null,
    b: null,
  }),

  /** FilterからLUTを生成 */
  toLut: (filter: Filter): Lut => {
    const masterLut = $Curve.toLut(filter.master)

    // 個別チャンネルがない場合はMasterのみ
    if (!filter.r && !filter.g && !filter.b) {
      return $Lut.fromMaster(masterLut)
    }

    // 個別チャンネルがある場合: Master → 個別の順で適用
    const rLut = filter.r ? $Curve.toLut(filter.r) : masterLut
    const gLut = filter.g ? $Curve.toLut(filter.g) : masterLut
    const bLut = filter.b ? $Curve.toLut(filter.b) : masterLut

    // Master適用後に個別チャンネル適用
    const result: Lut = {
      r: new Uint8Array(256),
      g: new Uint8Array(256),
      b: new Uint8Array(256),
    }

    for (let i = 0; i < 256; i++) {
      const afterMaster = masterLut[i]!
      result.r[i] = filter.r ? rLut[afterMaster]! : afterMaster
      result.g[i] = filter.g ? gLut[afterMaster]! : afterMaster
      result.b[i] = filter.b ? bLut[afterMaster]! : afterMaster
    }

    return result
  },

  /** Masterカーブを更新 */
  setMaster: (filter: Filter, master: Curve): Filter => ({
    ...filter,
    master,
  }),

  /** 個別チャンネルを設定 */
  setChannel: (
    filter: Filter,
    channel: 'r' | 'g' | 'b',
    curve: Curve | null
  ): Filter => ({
    ...filter,
    [channel]: curve,
  }),

  /** Masterを個別チャンネルに分離 */
  splitToChannels: (filter: Filter): Filter => ({
    ...filter,
    r: { points: [...filter.master.points] },
    g: { points: [...filter.master.points] },
    b: { points: [...filter.master.points] },
  }),

  /** 個別チャンネルをMasterに統合 (平均) */
  mergeToMaster: (filter: Filter): Filter => {
    if (!filter.r && !filter.g && !filter.b) {
      return filter
    }

    const pointCount = filter.master.points.length
    const points: number[] = []

    for (let i = 0; i < pointCount; i++) {
      const r = filter.r?.points[i] ?? filter.master.points[i]!
      const g = filter.g?.points[i] ?? filter.master.points[i]!
      const b = filter.b?.points[i] ?? filter.master.points[i]!
      points.push((r + g + b) / 3)
    }

    return {
      master: { points },
      r: null,
      g: null,
      b: null,
    }
  },
}
