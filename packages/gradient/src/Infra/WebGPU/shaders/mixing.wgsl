// ============================================
// Color mixing functions
// ============================================

// Gaussian weight function
// w = strength * exp(-d²/(2σ²))
fn gaussianWeight(dist: f32, radius: f32, softness: f32, strength: f32) -> f32 {
  // Map softness to sigma: higher softness = wider falloff
  let sigma = radius * (0.3 + softness * 0.7);
  let weight = exp(-(dist * dist) / (2.0 * sigma * sigma));
  return weight * strength;
}

// Calculate blended color at UV position
fn blendColors(uv: vec2f) -> vec4f {
  var totalWeight = 0.0;
  var blendedLab = vec3f(0.0);
  var blendedAlpha = 0.0;
  var avgChroma = 0.0;

  let pointCount = uniforms.pointCount;

  // Accumulate weighted colors
  for (var i = 0u; i < pointCount; i++) {
    let point = colorPoints[i];
    let dist = distance(uv, point.pos);
    let weight = gaussianWeight(dist, point.radius, uniforms.softness, point.strength);

    if (weight > 0.000001) {
      // Convert P3 to OKLab
      let lab = p3ToOklab(point.color.rgb);
      let chroma = length(lab.yz);

      // Accumulate
      blendedLab += weight * lab;
      blendedAlpha += weight * point.color.a;
      avgChroma += weight * chroma;
      totalWeight += weight;
    }
  }

  // Normalize
  if (totalWeight < 0.000001) {
    // Fallback: equal weights
    for (var i = 0u; i < pointCount; i++) {
      let point = colorPoints[i];
      let lab = p3ToOklab(point.color.rgb);
      blendedLab += lab;
      blendedAlpha += point.color.a;
      avgChroma += length(lab.yz);
    }
    totalWeight = f32(pointCount);
  }

  blendedLab /= totalWeight;
  blendedAlpha /= totalWeight;
  avgChroma /= totalWeight;

  // Apply chroma preservation
  if (uniforms.preserveChroma > 0.0) {
    let currentChroma = length(blendedLab.yz);
    if (currentChroma > 0.000001) {
      let targetChroma = currentChroma + (avgChroma - currentChroma) * uniforms.preserveChroma;
      let scale = targetChroma / currentChroma;
      blendedLab = vec3f(blendedLab.x, blendedLab.y * scale, blendedLab.z * scale);
    }
  }

  // Convert back to P3
  let p3 = clampP3(oklabToP3(blendedLab));
  return vec4f(p3, clamp(blendedAlpha, 0.0, 1.0));
}
