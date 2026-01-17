import { fullscreenVertex, aaUtils, oklabUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * 放射パターン用パラメータ
 */
export interface SunburstTextureParams {
  /** 光線の数 */
  rays: number
  /** 中心X座標 (0-1, 正規化) */
  centerX: number
  /** 中心Y座標 (0-1, 正規化) */
  centerY: number
  /** スパイラルツイスト係数 (0 = 直線) */
  twist: number
  /** 色1 RGBA (0-1) */
  color1: [number, number, number, number]
  /** 色2 RGBA (0-1) */
  color2: [number, number, number, number]
  /** ビューポート幅 */
  viewportWidth: number
  /** ビューポート高さ */
  viewportHeight: number
}

/**
 * 放射シェーダー
 * 日の出/サンバーストの放射線パターン
 */
export const sunburstShader = /* wgsl */ `
struct SunburstParams {
  color1: vec4f,
  color2: vec4f,
  rays: f32,
  centerX: f32,
  centerY: f32,
  twist: f32,
  viewportWidth: f32,
  viewportHeight: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: SunburstParams;

${fullscreenVertex}

${aaUtils}

${oklabUtils}

const PI: f32 = 3.14159265359;
const TWO_PI: f32 = 6.28318530718;

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // 中心からの相対座標を計算
  let centerPx = vec2f(
    params.centerX * params.viewportWidth,
    params.centerY * params.viewportHeight
  );
  let diff = pos.xy - centerPx;

  // 中心からの距離
  let dist = length(diff);

  // 角度を計算
  var angle = atan2(diff.y, diff.x);
  if (angle < 0.0) {
    angle = angle + TWO_PI;
  }

  // スパイラルツイストを適用
  angle = angle + dist * params.twist * 0.01;

  // 光線セクターへの正規化
  let rayAngle = TWO_PI / params.rays;
  let normalizedAngle = angle / rayAngle;

  // セクターインデックス
  let sector = floor(normalizedAngle);
  let sectorFrac = normalizedAngle - sector;

  // アンチエイリアス付きエッジ
  // 各セクターの境界でスムーズに切り替え
  let edgeWidth = 0.5 / (dist * rayAngle / TWO_PI + 1.0);
  let blend = smoothstep(0.5 - edgeWidth, 0.5 + edgeWidth, sectorFrac);

  // 交互の色
  let sectorParity = f32(i32(sector) % 2);
  let finalBlend = mix(sectorParity, 1.0 - sectorParity, blend);

  return mixOklabVec4(params.color1, params.color2, finalBlend);
}
`

/**
 * Create render spec for sunburst texture
 */
export function createSunburstSpec(params: SunburstTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.color1,
    ...params.color2,
    params.rays,
    params.centerX,
    params.centerY,
    params.twist,
    params.viewportWidth,
    params.viewportHeight,
    0, // padding
    0, // padding
  ])
  return {
    shader: sunburstShader,
    uniforms: data.buffer,
    bufferSize: 64,
  }
}
