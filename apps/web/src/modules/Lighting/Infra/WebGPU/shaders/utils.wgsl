// =============================================================================
// Utility Functions
// =============================================================================

// Safe inverse to avoid division by zero
// Returns large value with same sign as input; defaults to positive for exact zero
fn safeInverse(v: vec3f) -> vec3f {
  let large = 1.0 / SAFE_INV_EPSILON; // 1e8
  return vec3f(
    select(1.0 / v.x, select(large, -large, v.x < 0.0), abs(v.x) < SAFE_INV_EPSILON),
    select(1.0 / v.y, select(large, -large, v.y < 0.0), abs(v.y) < SAFE_INV_EPSILON),
    select(1.0 / v.z, select(large, -large, v.z < 0.0), abs(v.z) < SAFE_INV_EPSILON)
  );
}

// Build orthonormal basis from normal
fn buildBasis(normal: vec3f) -> mat3x3f {
  var tmp: vec3f;
  if (abs(normal.y) < 0.9) {
    tmp = vec3f(0.0, 1.0, 0.0);
  } else {
    tmp = vec3f(1.0, 0.0, 0.0);
  }
  let right = normalize(cross(tmp, normal));
  let up = cross(normal, right);
  return mat3x3f(right, up, normal);
}

// =============================================================================
// Color Space Conversion
// =============================================================================

// sRGB to Linear conversion
fn srgbToLinear(srgb: vec3f) -> vec3f {
  return pow(srgb, vec3f(GAMMA));
}

// Linear to sRGB conversion
fn linearToSrgb(linear: vec3f) -> vec3f {
  return pow(linear, vec3f(INV_GAMMA));
}

// =============================================================================
// Refraction and Fresnel
// =============================================================================

// Calculate refracted ray direction using Snell's law
// Returns vec4f(refractedDir.xyz, 1.0) on success, vec4f(0) on total internal reflection
fn calcRefraction(incident: vec3f, normal: vec3f, eta: f32) -> vec4f {
  let cosi = dot(-incident, normal);
  let k = 1.0 - eta * eta * (1.0 - cosi * cosi);

  // Total internal reflection
  if (k < 0.0) {
    return vec4f(0.0);
  }

  let refracted = eta * incident + (eta * cosi - sqrt(k)) * normal;
  return vec4f(normalize(refracted), 1.0);
}

// Fresnel reflectance using Schlick's approximation
fn fresnelSchlick(cosTheta: f32, ior: f32) -> f32 {
  let r0 = pow((1.0 - ior) / (1.0 + ior), 2.0);
  return r0 + (1.0 - r0) * pow(1.0 - cosTheta, 5.0);
}

// =============================================================================
// Signed Distance Functions (SDF)
// =============================================================================

// Signed Distance Function for 2D rounded box (XY plane only)
fn sdRoundBox2D(p: vec3f, b: vec3f, r: f32) -> f32 {
  let q = abs(p.xy) - b.xy + r;
  let d2d = length(max(q, vec2f(0.0))) + min(max(q.x, q.y), 0.0) - r;
  let dz = abs(p.z) - b.z;
  return max(d2d, dz);
}

// Signed Distance Function for 3D rounded box
fn sdRoundBox3D(p: vec3f, b: vec3f, r: f32) -> f32 {
  let q = abs(p) - b + r;
  return length(max(q, vec3f(0.0))) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

fn sdRoundBox(p: vec3f, b: vec3f, r: f32) -> f32 {
  if (b.z < r * 2.0) {
    return sdRoundBox2D(p, b, r);
  }
  return sdRoundBox3D(p, b, r);
}

// Calculate normal from SDF using gradient
fn calcRoundBoxNormal(p: vec3f, halfSize: vec3f, radius: f32) -> vec3f {
  return normalize(vec3f(
    sdRoundBox(p + vec3f(SDF_EPSILON, 0.0, 0.0), halfSize, radius) - sdRoundBox(p - vec3f(SDF_EPSILON, 0.0, 0.0), halfSize, radius),
    sdRoundBox(p + vec3f(0.0, SDF_EPSILON, 0.0), halfSize, radius) - sdRoundBox(p - vec3f(0.0, SDF_EPSILON, 0.0), halfSize, radius),
    sdRoundBox(p + vec3f(0.0, 0.0, SDF_EPSILON), halfSize, radius) - sdRoundBox(p - vec3f(0.0, 0.0, SDF_EPSILON), halfSize, radius)
  ));
}
