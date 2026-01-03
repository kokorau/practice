/**
 * Texture Pattern Functions (WGSL)
 *
 * 各テクスチャパターンをWGSL関数として定義。
 * マスク付きテクスチャシェーダーで再利用される。
 */

/** Stripe texture pattern function */
export const stripePatternFn = /* wgsl */ `
fn stripePattern(pos: vec2f, color1: vec4f, color2: vec4f, width1: f32, width2: f32, angle: f32) -> vec4f {
  let cosA = cos(angle);
  let sinA = sin(angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;

  let period = width1 + width2;
  let t = rotatedX % period;
  let normalizedT = select(t, t + period, t < 0.0);

  let edge1 = aaStep(width1, normalizedT);
  let edge2 = aaStep(period, normalizedT);
  let blend = edge1 - edge2;

  return mix(color1, color2, blend);
}
`

/** Grid texture pattern function */
export const gridPatternFn = /* wgsl */ `
fn gridPattern(pos: vec2f, lineColor: vec4f, bgColor: vec4f, lineWidth: f32, cellSize: f32) -> vec4f {
  let x = pos.x % cellSize;
  let y = pos.y % cellSize;

  let halfLine = lineWidth * 0.5;
  let distX = min(x, cellSize - x);
  let distY = min(y, cellSize - y);

  let lineX = 1.0 - aaStep(halfLine, distX);
  let lineY = 1.0 - aaStep(halfLine, distY);

  let onLine = max(lineX, lineY);
  return mix(bgColor, lineColor, onLine);
}
`

/** Polka dot texture pattern function */
export const polkaDotPatternFn = /* wgsl */ `
fn polkaDotPattern(pos: vec2f, dotColor: vec4f, bgColor: vec4f, dotRadius: f32, spacing: f32, rowOffset: f32) -> vec4f {
  let row = floor(pos.y / spacing);
  let xOffset = row * spacing * rowOffset;

  let cellX = (pos.x + xOffset) % spacing;
  let cellY = pos.y % spacing;

  let center = spacing * 0.5;
  let dx = cellX - center;
  let dy = cellY - center;
  let dist = sqrt(dx * dx + dy * dy);

  let dotMask = 1.0 - aaStep(dotRadius, dist);
  return mix(bgColor, dotColor, dotMask);
}
`

/** Checker texture pattern function */
export const checkerPatternFn = /* wgsl */ `
fn checkerPattern(pos: vec2f, color1: vec4f, color2: vec4f, cellSize: f32, angle: f32) -> vec4f {
  let cosA = cos(angle);
  let sinA = sin(angle);
  let rotatedX = pos.x * cosA + pos.y * sinA;
  let rotatedY = -pos.x * sinA + pos.y * cosA;

  let cellX = floor(rotatedX / cellSize);
  let cellY = floor(rotatedY / cellSize);
  let isEven = (i32(cellX) + i32(cellY)) % 2 == 0;

  return select(color2, color1, isEven);
}
`
