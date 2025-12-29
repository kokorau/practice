// ============================================
// Noise functions for domain warp
// ============================================

// 2D hash function -> random 2D vector
fn hash2(p: vec2f) -> vec2f {
  var p2 = vec2f(
    dot(p, vec2f(127.1, 311.7)),
    dot(p, vec2f(269.5, 183.3))
  );
  return fract(sin(p2) * 43758.5453) * 2.0 - 1.0;
}

// Gradient noise (Perlin-like)
fn gradientNoise(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);

  // Quintic interpolation curve (smoother than cubic)
  let u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);

  // Four corners
  let a = dot(hash2(i + vec2f(0.0, 0.0)), f - vec2f(0.0, 0.0));
  let b = dot(hash2(i + vec2f(1.0, 0.0)), f - vec2f(1.0, 0.0));
  let c = dot(hash2(i + vec2f(0.0, 1.0)), f - vec2f(0.0, 1.0));
  let d = dot(hash2(i + vec2f(1.0, 1.0)), f - vec2f(1.0, 1.0));

  // Bilinear interpolation
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion (FBM)
fn fbm(p: vec2f, seed: f32, octaves: u32, lacunarity: f32, gain: f32) -> f32 {
  var value = 0.0;
  var amplitude = 1.0;
  var frequency = 1.0;
  var pos = p + vec2f(seed * 17.0, seed * 31.0);

  for (var i = 0u; i < octaves; i++) {
    value += amplitude * gradientNoise(pos * frequency);
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value;
}

// Apply domain warp to UV coordinates
fn applyWarp(uv: vec2f) -> vec2f {
  if (uniforms.warpAmplitude < 0.0001) {
    return uv;
  }

  let freq = uniforms.warpFrequency;
  let oct = uniforms.warpOctaves;
  let lac = uniforms.warpLacunarity;
  let gain = uniforms.warpGain;
  let seed = uniforms.warpSeed;

  // Offset for Y component to get different noise pattern
  let noiseX = fbm(uv * freq, seed, oct, lac, gain);
  let noiseY = fbm(uv * freq + vec2f(100.0, 100.0), seed + 17.0, oct, lac, gain);

  return uv + vec2f(noiseX, noiseY) * uniforms.warpAmplitude;
}
