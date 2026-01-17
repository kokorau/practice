import { fullscreenVertex, aaUtils, oklabUtils } from './common'
import type { TextureRenderSpec } from '../Domain'

/**
 * オジーパターン用パラメータ
 */
export interface OgeeTextureParams {
  /** セルの幅 (px) */
  width: number
  /** セルの高さ (px) */
  height: number
  /** 線の太さ (px) */
  lineWidth: number
  /** 線の色 RGBA (0-1) */
  lineColor: [number, number, number, number]
  /** 背景色 RGBA (0-1) */
  bgColor: [number, number, number, number]
}

/**
 * オジーシェーダー
 * モロッコ/イスラム風のS字曲線装飾パターン
 */
export const ogeeShader = /* wgsl */ `
struct OgeeParams {
  lineColor: vec4f,
  bgColor: vec4f,
  width: f32,
  height: f32,
  lineWidth: f32,
  _padding: f32,
}

@group(0) @binding(0) var<uniform> params: OgeeParams;

${fullscreenVertex}

${aaUtils}

${oklabUtils}

const PI: f32 = 3.14159265359;

// オジー曲線への距離を計算
fn ogeeDistance(p: vec2f, w: f32, h: f32) -> f32 {
  // 正規化座標 (-1 to 1)
  let nx = p.x / (w * 0.5);
  let ny = p.y / (h * 0.5);

  // 上下のS字曲線を計算
  // オジー形状: 2つの反対向きの正弦波を組み合わせ
  let curveY = sin(nx * PI);

  // 上側曲線（y = curveY * 0.5 + 0.5）と下側曲線（y = -curveY * 0.5 - 0.5）
  let distTop = abs(ny - curveY * 0.5 - 0.5);
  let distBot = abs(ny + curveY * 0.5 + 0.5);

  // スケールを戻す
  return min(distTop, distBot) * h * 0.5;
}

@fragment
fn fragmentMain(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let w = params.width;
  let h = params.height;

  // グリッドセル
  let col = floor(pos.x / w);
  let row = floor(pos.y / h);
  let isOddCol = (i32(col) % 2) == 1;
  let isOddRow = (i32(row) % 2) == 1;

  // セル内のローカル座標（中心基準）
  var localX = pos.x - col * w - w * 0.5;
  var localY = pos.y - row * h - h * 0.5;

  // 奇数列は水平反転
  if (isOddCol) {
    localX = -localX;
  }
  // 奇数行は垂直反転
  if (isOddRow) {
    localY = -localY;
  }

  let localP = vec2f(localX, localY);

  // オジー曲線への距離
  var minDist = ogeeDistance(localP, w, h);

  // 隣接セルの曲線もチェック
  let offsets = array<vec2f, 4>(
    vec2f(w, 0.0),
    vec2f(-w, 0.0),
    vec2f(0.0, h),
    vec2f(0.0, -h)
  );

  for (var i = 0; i < 4; i++) {
    let offsetCol = col + sign(offsets[i].x);
    let offsetRow = row + sign(offsets[i].y);
    let checkOddCol = (i32(offsetCol) % 2) == 1;
    let checkOddRow = (i32(offsetRow) % 2) == 1;

    var checkX = localX - offsets[i].x;
    var checkY = localY - offsets[i].y;

    // 隣接セルの反転を考慮
    if (checkOddCol != isOddCol) {
      checkX = -checkX;
    }
    if (checkOddRow != isOddRow) {
      checkY = -checkY;
    }

    minDist = min(minDist, ogeeDistance(vec2f(checkX, checkY), w, h));
  }

  // アンチエイリアス付きで線を描画
  let halfWidth = params.lineWidth * 0.5;
  let blend = 1.0 - aaStep(halfWidth, minDist);

  return mixOklabVec4(params.bgColor, params.lineColor, blend);
}
`

/**
 * Create render spec for ogee texture
 */
export function createOgeeSpec(params: OgeeTextureParams): TextureRenderSpec {
  const data = new Float32Array([
    ...params.lineColor,
    ...params.bgColor,
    params.width,
    params.height,
    params.lineWidth,
    0, // padding
  ])
  return {
    shader: ogeeShader,
    uniforms: data.buffer,
    bufferSize: 48,
  }
}
