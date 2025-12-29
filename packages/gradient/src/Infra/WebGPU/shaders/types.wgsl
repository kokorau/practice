// ============================================
// GPU struct definitions (must match TypeScript buffer layouts)
// ============================================

// Color point (32 bytes, aligned)
struct ColorPoint {
  pos: vec2f,          // 0-7: UV position
  radius: f32,         // 8-11: influence radius
  strength: f32,       // 12-15: weight multiplier
  color: vec4f,        // 16-31: P3 RGBA (linear)
}

// Gradient uniforms (96 bytes)
struct GradientUniforms {
  // Mix settings (16 bytes)
  softness: f32,           // 0-3
  preserveChroma: f32,     // 4-7
  pointCount: u32,         // 8-11
  _pad0: f32,              // 12-15

  // Warp settings (32 bytes)
  warpSeed: f32,           // 16-19
  warpAmplitude: f32,      // 20-23
  warpFrequency: f32,      // 24-27
  warpOctaves: u32,        // 28-31
  warpLacunarity: f32,     // 32-35
  warpGain: f32,           // 36-39
  _pad1: vec2f,            // 40-47

  // Post settings (16 bytes)
  grainSeed: f32,          // 48-51
  grainAmount: f32,        // 52-55
  grainScale: f32,         // 56-59
  ditherAmount: f32,       // 60-63

  // Resolution (16 bytes)
  resolution: vec2f,       // 64-71
  _pad2: vec2f,            // 72-79

  // Reserved for future use (16 bytes)
  _reserved: vec4f,        // 80-95
}

// Vertex output
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

// ============================================
// Bindings
// ============================================

@group(0) @binding(0) var<uniform> uniforms: GradientUniforms;
@group(0) @binding(1) var<storage, read> colorPoints: array<ColorPoint>;
