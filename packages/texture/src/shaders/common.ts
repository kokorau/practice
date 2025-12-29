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
