import { fullscreenVertex, aaUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * 麻の葉パターン用パラメータ
 */
export interface AsanohaTextureParams {
  /** 六角形のサイズ (px) */
  size: number
  /** 線の太さ (px) */
  lineWidth: number
  /** 線の色 RGBA (0-1) */
  lineColor: [number, number, number, number]
  /** 背景色 RGBA (0-1) */
  bgColor: [number, number, number, number]
}

/**
 * 麻の葉シェーダー
 * 伝統的な日本の六角形幾何学模様
 */
export const asanohaShader = /* wgsl */ `
struct AsanohaParams {
  lineColor: vec4f,
  bgColor: vec4f,
  size: f32,
  lineWidth: f32,
  _padding1: f32,
  _padding2: f32,
}

@group(0) @binding(0) var<uniform> params: AsanohaParams;

${fullscreenVertex}

${aaUtils}

const SQRT3: f32 = 1.732050808;

// 点から線分への最短距離
fn distToSegment(p: vec2f, a: vec2f, b: vec2f) -> f32 {
  let pa = p - a;
  let ba = b - a;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

// 麻の葉の単位セルを描画
fn asanohaCell(p: vec2f, size: f32) -> f32 {
  let h = size;
  let w = size * SQRT3 / 2.0;

  // 六角形の中心から各頂点への線
  // 頂点は上、右上、右下、下、左下、左上
  let top = vec2f(0.0, h);
  let topRight = vec2f(w, h * 0.5);
  let botRight = vec2f(w, -h * 0.5);
  let bot = vec2f(0.0, -h);
  let botLeft = vec2f(-w, -h * 0.5);
  let topLeft = vec2f(-w, h * 0.5);
  let center = vec2f(0.0, 0.0);

  // 中心から6頂点への線
  var d = distToSegment(p, center, top);
  d = min(d, distToSegment(p, center, topRight));
  d = min(d, distToSegment(p, center, botRight));
  d = min(d, distToSegment(p, center, bot));
  d = min(d, distToSegment(p, center, botLeft));
  d = min(d, distToSegment(p, center, topLeft));

  // 中心から6辺の中点への線
  let midTop = (top + topRight) * 0.5;
  let midRight = (topRight + botRight) * 0.5;
  let midBotRight = (botRight + bot) * 0.5;
  let midBot = (bot + botLeft) * 0.5;
  let midLeft = (botLeft + topLeft) * 0.5;
  let midTopLeft = (topLeft + top) * 0.5;

  d = min(d, distToSegment(p, center, midTop));
  d = min(d, distToSegment(p, center, midRight));
  d = min(d, distToSegment(p, center, midBotRight));
  d = min(d, distToSegment(p, center, midBot));
  d = min(d, distToSegment(p, center, midLeft));
  d = min(d, distToSegment(p, center, midTopLeft));

  // 六角形の辺
  d = min(d, distToSegment(p, top, topRight));
  d = min(d, distToSegment(p, topRight, botRight));
  d = min(d, distToSegment(p, botRight, bot));
  d = min(d, distToSegment(p, bot, botLeft));
  d = min(d, distToSegment(p, botLeft, topLeft));
  d = min(d, distToSegment(p, topLeft, top));

  return d;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let size = params.size;
  let w = size * SQRT3;
  let h = size * 2.0;

  // 六角形グリッドへの変換
  var p = pos.xy;

  // 行を計算
  let row = floor(p.y / (h * 0.75));
  let isOddRow = (i32(row) % 2) == 1;

  // 奇数行はx方向にオフセット
  if (isOddRow) {
    p.x = p.x - w * 0.5;
  }

  // 列を計算
  let col = floor(p.x / w);

  // セル内のローカル座標
  let cellX = p.x - col * w - w * 0.5;
  let cellY = p.y - row * h * 0.75 - size;
  let localP = vec2f(cellX, cellY);

  // 隣接セルもチェック（境界の線を正しく描画するため）
  var minDist = asanohaCell(localP, size);

  // 隣接セルへのオフセット
  let offsets = array<vec2f, 6>(
    vec2f(w, 0.0),
    vec2f(-w, 0.0),
    vec2f(w * 0.5, h * 0.75),
    vec2f(-w * 0.5, h * 0.75),
    vec2f(w * 0.5, -h * 0.75),
    vec2f(-w * 0.5, -h * 0.75)
  );

  for (var i = 0; i < 6; i++) {
    minDist = min(minDist, asanohaCell(localP - offsets[i], size));
  }

  // アンチエイリアス付きで線を描画
  let halfWidth = params.lineWidth * 0.5;
  let blend = 1.0 - aaStep(halfWidth, minDist);

  return mix(params.bgColor, params.lineColor, blend);
}
`

/**
 * Create render spec for asanoha texture
 */
export function createAsanohaSpec(params: AsanohaTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.lineColor,
    ...params.bgColor,
    params.size,
    params.lineWidth,
    0, // padding
    0, // padding
  ])
  return {
    shader: asanohaShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
