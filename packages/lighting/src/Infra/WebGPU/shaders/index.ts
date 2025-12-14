/**
 * WGSL Shader Module Combiner
 *
 * WGSLにはネイティブのモジュールシステムがないため、
 * TypeScript側でファイルを結合してエクスポートする
 *
 * 依存関係の順序:
 * 1. constants - 定数定義
 * 2. types - 構造体とバインディング
 * 3. utils - 数学関数、色変換、SDF
 * 4. intersections - 形状の交差判定
 * 5. bvh - BVHトラバーサル関数
 * 6. tracing - レイトレーシングコア
 * 7. main - シェーダーエントリポイント
 */

import constants from './constants.wgsl?raw'
import types from './types.wgsl?raw'
import utils from './utils.wgsl?raw'
import intersections from './intersections.wgsl?raw'
import bvh from './bvh.wgsl?raw'
import tracing from './tracing.wgsl?raw'
import main from './main.wgsl?raw'

export const SHADER_CODE = [
  constants,
  types,
  utils,
  intersections,
  bvh,
  tracing,
  main,
].join('\n')
