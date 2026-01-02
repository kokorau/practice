/** フルスクリーン三角形の頂点シェーダー */
export const fullscreenVertex = /* wgsl */ `
@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
  var pos = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0)
  );
  return vec4f(pos[vertexIndex], 0.0, 1.0);
}
`

/** アンチエイリアス用ユーティリティ関数 */
export const aaUtils = /* wgsl */ `
// アンチエイリアス用のスムーズステップ（1pxのエッジ）
fn aaStep(edge: f32, x: f32) -> f32 {
  return smoothstep(edge - 0.5, edge + 0.5, x);
}

// 2色間のアンチエイリアス補間
fn aaMix(color1: vec4f, color2: vec4f, edge: f32, x: f32) -> vec4f {
  let t = aaStep(edge, x);
  return mix(color1, color2, t);
}
`

/** マスク用ブレンドステート（アルファブレンド） */
export const maskBlendState: GPUBlendState = {
  color: {
    srcFactor: 'src-alpha',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
  alpha: {
    srcFactor: 'one',
    dstFactor: 'one-minus-src-alpha',
    operation: 'add',
  },
}

// ============================================================
// Noise Utilities
// ============================================================

/** ハッシュ関数（2D → 1D） */
export const hash21 = /* wgsl */ `
fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.x, p.y, p.x) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`

/** ハッシュ関数（2D → 2D） */
export const hash22 = /* wgsl */ `
fn hash22(p: vec2f) -> vec2f {
  var p3 = fract(vec3f(p.x, p.y, p.x) * vec3f(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
`

/**
 * Interleaved Gradient Noise (IGN)
 * ブルーノイズ的な分布を持つ高速ノイズ
 * Reference: Jorge Jimenez, "Next Generation Post Processing in Call of Duty"
 */
export const interleavedGradientNoise = /* wgsl */ `
fn interleavedGradientNoise(pos: vec2f, seed: f32) -> f32 {
  let magic = vec3f(0.06711056, 0.00583715, 52.9829189);
  let p = pos + seed * 5.588238;
  return fract(magic.z * fract(dot(p, magic.xy)));
}
`

/**
 * Value Noise（格子点補間ノイズ）
 * hash21 が必要
 */
export const valueNoise = /* wgsl */ `
fn valueNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);  // smoothstep

  let a = hash21(i);
  let b = hash21(i + vec2f(1.0, 0.0));
  let c = hash21(i + vec2f(0.0, 1.0));
  let d = hash21(i + vec2f(1.0, 1.0));

  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
`

/**
 * fBm (Fractal Brownian Motion)
 * valueNoise が必要、オクターブ数は固定（4）
 */
export const fbm = /* wgsl */ `
fn fbm(p: vec2f) -> f32 {
  var value = 0.0;
  var amplitude = 0.5;
  var pos = p;

  for (var i = 0; i < 4; i++) {
    value += amplitude * valueNoise(pos);
    pos *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`

/** ノイズユーティリティをまとめたもの（hash21 + IGN + valueNoise） */
export const noiseUtils = /* wgsl */ `
${hash21}
${interleavedGradientNoise}
${valueNoise}
`
