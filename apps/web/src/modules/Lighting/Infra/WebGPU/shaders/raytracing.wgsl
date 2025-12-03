// =============================================================================
// Constants
// =============================================================================

const EPSILON: f32 = 1e-6;           // General epsilon for comparisons
const SHADOW_OFFSET: f32 = 0.001;    // Offset to avoid self-shadowing
const MAX_DISTANCE: f32 = 1e10;      // Maximum ray distance
const SDF_EPSILON: f32 = 0.0001;     // Epsilon for SDF normal calculation
const RAY_MARCH_MAX_STEPS: i32 = 128; // Maximum steps for ray marching
const RAY_MARCH_MIN_DIST: f32 = 0.0001; // Minimum distance for ray march hit
const GAMMA: f32 = 2.2;              // sRGB gamma value
const INV_GAMMA: f32 = 1.0 / 2.2;    // Inverse gamma for linear to sRGB
const SAFE_INV_EPSILON: f32 = 1e-8;  // Epsilon for safe division
const PCF_SAMPLE_COUNT: i32 = 9;     // 3x3 PCF samples
const MAX_BOUNCES: i32 = 4;          // Maximum ray bounces for transparency/refraction
const AIR_IOR: f32 = 1.0;            // Index of refraction for air

// =============================================================================
// Structs
// =============================================================================

// Camera uniforms (80 bytes)
struct Camera {
  position: vec3f,      // 0-11, pad 12-15
  _pad0: f32,
  forward: vec3f,       // 16-27, pad 28-31
  _pad1: f32,
  right: vec3f,         // 32-43, pad 44-47
  _pad2: f32,
  up: vec3f,            // 48-59, pad 60-63
  _pad3: f32,
  width: f32,           // 64-67
  height: f32,          // 68-71
  _pad4: f32,           // 72-75
  _pad5: f32,           // 76-79
}

// Plane data (64 bytes)
struct Plane {
  point: vec3f,         // 0-11, pad 12-15
  _pad0: f32,
  normal: vec3f,        // 16-27, pad 28-31
  _pad1: f32,
  color: vec3f,         // 32-43
  alpha: f32,           // 44-47 (0 = transparent, 1 = opaque)
  size: vec2f,          // 48-55
  ior: f32,             // 56-59 (index of refraction)
  _pad2: f32,           // 60-63
}

// Box data (160 bytes)
struct Box {
  center: vec3f,        // 0-11, pad 12-15
  _pad0: f32,
  size: vec3f,          // 16-27, pad 28-31
  _pad1: f32,
  color: vec3f,         // 32-43
  radius: f32,          // 44-47
  alpha: f32,           // 48-51 (0 = transparent, 1 = opaque)
  ior: f32,             // 52-55 (index of refraction)
  _pad2: f32,           // 56-59
  _pad3: f32,           // 60-63
  rotation: mat3x3f,    // 64-111 (3 x vec3f with padding = 48 bytes)
  rotationInv: mat3x3f, // 112-159
}

// Capsule data (64 bytes)
struct Capsule {
  pointA: vec3f,        // 0-11, pad 12-15
  _pad0: f32,
  pointB: vec3f,        // 16-27, pad 28-31
  _pad1: f32,
  color: vec3f,         // 32-43
  radius: f32,          // 44-47
  alpha: f32,           // 48-51 (0 = transparent, 1 = opaque)
  ior: f32,             // 52-55 (index of refraction)
  _pad2: f32,           // 56-59
  _pad3: f32,           // 60-63
}

// Sphere data (48 bytes)
struct Sphere {
  center: vec3f,        // 0-11, pad 12-15
  _pad0: f32,
  color: vec3f,         // 16-27
  radius: f32,          // 28-31
  alpha: f32,           // 32-35 (0 = transparent, 1 = opaque)
  ior: f32,             // 36-39 (index of refraction)
  _pad1: f32,           // 40-43
  _pad2: f32,           // 44-47
}

// Directional light (32 bytes)
struct DirLight {
  direction: vec3f,     // 0-11, pad 12-15
  _pad0: f32,
  color: vec3f,         // 16-27
  intensity: f32,       // 28-31
}

// Scene uniforms (144 bytes)
struct SceneUniforms {
  camera: Camera,           // 0-79
  backgroundColor: vec3f,   // 80-91, pad 92-95
  _pad0: f32,
  ambientColor: vec3f,      // 96-107
  ambientIntensity: f32,    // 108-111
  shadowBlur: f32,          // 112-115
  planeCount: u32,          // 116-119
  boxCount: u32,            // 120-123
  lightCount: u32,          // 124-127
  capsuleCount: u32,        // 128-131
  sphereCount: u32,         // 132-135
  _pad1: u32,               // 136-139
  _pad2: u32,               // 140-143
}

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(0) @binding(1) var<storage, read> planes: array<Plane>;
@group(0) @binding(2) var<storage, read> boxes: array<Box>;
@group(0) @binding(3) var<storage, read> lights: array<DirLight>;
@group(0) @binding(4) var<storage, read> capsules: array<Capsule>;
@group(0) @binding(5) var<storage, read> spheres: array<Sphere>;

// =============================================================================
// Utility Functions
// =============================================================================

// Safe inverse to avoid division by zero
fn safeInverse(v: vec3f) -> vec3f {
  return vec3f(
    select(1.0 / v.x, sign(v.x) / SAFE_INV_EPSILON, abs(v.x) < SAFE_INV_EPSILON),
    select(1.0 / v.y, sign(v.y) / SAFE_INV_EPSILON, abs(v.y) < SAFE_INV_EPSILON),
    select(1.0 / v.z, sign(v.z) / SAFE_INV_EPSILON, abs(v.z) < SAFE_INV_EPSILON)
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

// sRGB to Linear conversion
fn srgbToLinear(srgb: vec3f) -> vec3f {
  return pow(srgb, vec3f(GAMMA));
}

// Linear to sRGB conversion
fn linearToSrgb(linear: vec3f) -> vec3f {
  return pow(linear, vec3f(INV_GAMMA));
}

// Hit information structure for ray tracing
struct HitInfo {
  t: f32,
  color: vec3f,
  normal: vec3f,
  alpha: f32,
  ior: f32,
}

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

// Ray-plane intersection
fn intersectPlane(rayOrigin: vec3f, rayDir: vec3f, plane: Plane) -> f32 {
  let denom = dot(rayDir, plane.normal);
  if (abs(denom) < EPSILON) {
    return -1.0;
  }

  let diff = plane.point - rayOrigin;
  let t = dot(diff, plane.normal) / denom;

  if (t < 0.0) {
    return -1.0;
  }

  // Check bounds if plane has finite size
  if (plane.size.x > 0.0 || plane.size.y > 0.0) {
    let hitPoint = rayOrigin + t * rayDir;
    let localOffset = hitPoint - plane.point;
    let basis = buildBasis(plane.normal);
    let u = dot(localOffset, basis[0]);
    let v = dot(localOffset, basis[1]);

    var halfWidth: f32;
    var halfHeight: f32;
    if (plane.size.x > 0.0) { halfWidth = plane.size.x * 0.5; } else { halfWidth = 1e10; }
    if (plane.size.y > 0.0) { halfHeight = plane.size.y * 0.5; } else { halfHeight = 1e10; }

    if (abs(u) > halfWidth || abs(v) > halfHeight) {
      return -1.0;
    }
  }

  return t;
}

// Ray-OBB intersection (sharp box)
fn intersectBox(rayOrigin: vec3f, rayDir: vec3f, box: Box) -> vec2f {
  // Returns vec2f(t, normalAxis) where normalAxis encodes which face was hit
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = box.rotation * rayDir;

  let halfSize = box.size * 0.5;
  let invDir = safeInverse(localDir);

  let t1 = (-halfSize - localOrigin) * invDir;
  let t2 = (halfSize - localOrigin) * invDir;

  let tMin = min(t1, t2);
  let tMax = max(t1, t2);

  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return vec2f(-1.0, 0.0);
  }

  var t: f32;
  if (tNear > 0.0) { t = tNear; } else { t = tFar; }

  // Encode which axis was hit (1=x, 2=y, 3=z)
  let hitPoint = localOrigin + t * localDir;
  let d = abs(hitPoint) - halfSize;
  var axis: f32 = 3.0;
  if (d.x > d.y && d.x > d.z) {
    axis = 1.0;
  } else if (d.y > d.z) {
    axis = 2.0;
  }

  return vec2f(t, axis);
}

fn getBoxNormal(box: Box, localHitPoint: vec3f, axis: f32) -> vec3f {
  var localNormal: vec3f;
  if (axis < 1.5) {
    localNormal = vec3f(sign(localHitPoint.x), 0.0, 0.0);
  } else if (axis < 2.5) {
    localNormal = vec3f(0.0, sign(localHitPoint.y), 0.0);
  } else {
    localNormal = vec3f(0.0, 0.0, sign(localHitPoint.z));
  }
  return normalize(box.rotationInv * localNormal);
}

// Ray-RoundBox intersection using ray marching
fn intersectRoundBox(rayOrigin: vec3f, rayDir: vec3f, box: Box) -> vec2f {
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = normalize(box.rotation * rayDir);
  let halfSize = box.size * 0.5;
  let radius = box.radius;

  // Quick AABB bounds check
  let invDir = safeInverse(localDir);
  let t1 = (-halfSize - radius - localOrigin) * invDir;
  let t2 = (halfSize + radius - localOrigin) * invDir;
  let tMin = min(t1, t2);
  let tMax = max(t1, t2);
  let tNear = max(max(tMin.x, tMin.y), tMin.z);
  let tFar = min(min(tMax.x, tMax.y), tMax.z);

  if (tNear > tFar || tFar < 0.0) {
    return vec2f(-1.0, 0.0);
  }

  // Ray marching
  var t = max(tNear - SHADOW_OFFSET, 0.0);

  for (var i = 0; i < RAY_MARCH_MAX_STEPS; i++) {
    let p = localOrigin + t * localDir;
    let d = sdRoundBox(p, halfSize, radius);

    if (d < RAY_MARCH_MIN_DIST) {
      return vec2f(t, 1.0); // Hit, flag as rounded
    }

    t += d;

    if (t > tFar) {
      break;
    }
  }

  return vec2f(-1.0, 0.0);
}

fn getRoundBoxNormal(box: Box, rayOrigin: vec3f, rayDir: vec3f, t: f32) -> vec3f {
  let localOrigin = box.rotation * (rayOrigin - box.center);
  let localDir = normalize(box.rotation * rayDir);
  let p = localOrigin + t * localDir;
  let localNormal = calcRoundBoxNormal(p, box.size * 0.5, box.radius);
  return normalize(box.rotationInv * localNormal);
}

// Ray-Capsule intersection (cylinder with hemispherical caps)
fn intersectCapsule(rayOrigin: vec3f, rayDir: vec3f, capsule: Capsule) -> f32 {
  let pa = capsule.pointA;
  let pb = capsule.pointB;
  let r = capsule.radius;

  let ba = pb - pa;
  let oa = rayOrigin - pa;

  let baba = dot(ba, ba);
  let bard = dot(ba, rayDir);
  let baoa = dot(ba, oa);
  let rdoa = dot(rayDir, oa);
  let oaoa = dot(oa, oa);

  let a = baba - bard * bard;
  let b = baba * rdoa - baoa * bard;
  let c = baba * oaoa - baoa * baoa - r * r * baba;
  let h = b * b - a * c;

  if (h >= 0.0) {
    let t = (-b - sqrt(h)) / a;
    let y = baoa + t * bard;

    // Cylinder body hit
    if (y > 0.0 && y < baba && t > 0.0) {
      return t;
    }

    // Hemisphere caps
    var oc: vec3f;
    if (y <= 0.0) {
      oc = oa;
    } else {
      oc = rayOrigin - pb;
    }

    let b2 = dot(rayDir, oc);
    let c2 = dot(oc, oc) - r * r;
    let h2 = b2 * b2 - c2;

    if (h2 > 0.0) {
      let t2 = -b2 - sqrt(h2);
      if (t2 > 0.0) {
        return t2;
      }
    }
  }

  return -1.0;
}

fn getCapsuleNormal(capsule: Capsule, hitPoint: vec3f) -> vec3f {
  let ba = capsule.pointB - capsule.pointA;
  let pa = hitPoint - capsule.pointA;
  let h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return normalize(pa - h * ba);
}

// Ray-Sphere intersection
fn intersectSphere(rayOrigin: vec3f, rayDir: vec3f, sphere: Sphere) -> f32 {
  let oc = rayOrigin - sphere.center;
  let a = dot(rayDir, rayDir);
  let b = 2.0 * dot(oc, rayDir);
  let c = dot(oc, oc) - sphere.radius * sphere.radius;
  let discriminant = b * b - 4.0 * a * c;

  if (discriminant < 0.0) {
    return -1.0;
  }

  let t = (-b - sqrt(discriminant)) / (2.0 * a);
  if (t > 0.0) {
    return t;
  }

  // Check the far intersection
  let t2 = (-b + sqrt(discriminant)) / (2.0 * a);
  if (t2 > 0.0) {
    return t2;
  }

  return -1.0;
}

fn getSphereNormal(sphere: Sphere, hitPoint: vec3f) -> vec3f {
  return normalize(hitPoint - sphere.center);
}

// Trace primary ray and find closest hit with full material info
fn traceRay(rayOrigin: vec3f, rayDir: vec3f) -> HitInfo {
  var hit: HitInfo;
  hit.t = MAX_DISTANCE;
  hit.color = scene.backgroundColor;
  hit.normal = vec3f(0.0);
  hit.alpha = 1.0;
  hit.ior = AIR_IOR;

  // Check planes
  for (var i = 0u; i < scene.planeCount; i++) {
    let plane = planes[i];
    let t = intersectPlane(rayOrigin, rayDir, plane);

    if (t > 0.0 && t < hit.t) {
      hit.t = t;
      hit.color = plane.color;
      hit.normal = plane.normal;
      hit.alpha = plane.alpha;
      hit.ior = plane.ior;
    }
  }

  // Check boxes
  for (var i = 0u; i < scene.boxCount; i++) {
    let box = boxes[i];
    var result: vec2f;

    if (box.radius > 0.0) {
      result = intersectRoundBox(rayOrigin, rayDir, box);
    } else {
      result = intersectBox(rayOrigin, rayDir, box);
    }

    let t = result.x;
    if (t > 0.0 && t < hit.t) {
      hit.t = t;
      hit.color = box.color;
      hit.alpha = box.alpha;
      hit.ior = box.ior;

      if (box.radius > 0.0) {
        hit.normal = getRoundBoxNormal(box, rayOrigin, rayDir, t);
      } else {
        let localOrigin = box.rotation * (rayOrigin - box.center);
        let localDir = box.rotation * rayDir;
        let localHit = localOrigin + t * localDir;
        hit.normal = getBoxNormal(box, localHit, result.y);
      }
    }
  }

  // Check capsules
  for (var i = 0u; i < scene.capsuleCount; i++) {
    let capsule = capsules[i];
    let t = intersectCapsule(rayOrigin, rayDir, capsule);

    if (t > 0.0 && t < hit.t) {
      hit.t = t;
      hit.color = capsule.color;
      hit.alpha = capsule.alpha;
      hit.ior = capsule.ior;
      let hitPoint = rayOrigin + t * rayDir;
      hit.normal = getCapsuleNormal(capsule, hitPoint);
    }
  }

  // Check spheres
  for (var i = 0u; i < scene.sphereCount; i++) {
    let sphere = spheres[i];
    let t = intersectSphere(rayOrigin, rayDir, sphere);

    if (t > 0.0 && t < hit.t) {
      hit.t = t;
      hit.color = sphere.color;
      hit.alpha = sphere.alpha;
      hit.ior = sphere.ior;
      let hitPoint = rayOrigin + t * rayDir;
      hit.normal = getSphereNormal(sphere, hitPoint);
    }
  }

  return hit;
}

// Shadow ray (simplified, returns distance or -1)
fn traceShadow(hitPoint: vec3f, lightDir: vec3f) -> f32 {
  let shadowOrigin = hitPoint + lightDir * SHADOW_OFFSET;

  for (var i = 0u; i < scene.boxCount; i++) {
    let box = boxes[i];
    var result: vec2f;
    if (box.radius > 0.0) {
      result = intersectRoundBox(shadowOrigin, lightDir, box);
    } else {
      result = intersectBox(shadowOrigin, lightDir, box);
    }
    if (result.x > 0.0) {
      return result.x;
    }
  }

  for (var i = 0u; i < scene.capsuleCount; i++) {
    let capsule = capsules[i];
    let t = intersectCapsule(shadowOrigin, lightDir, capsule);
    if (t > 0.0) {
      return t;
    }
  }

  for (var i = 0u; i < scene.sphereCount; i++) {
    let sphere = spheres[i];
    let t = intersectSphere(shadowOrigin, lightDir, sphere);
    if (t > 0.0) {
      return t;
    }
  }

  return -1.0;
}

// PCF shadow sampling
fn sampleShadowAt(hitPoint: vec3f, lightDir: vec3f, lightRight: vec3f, lightUp: vec3f, offset: vec2f) -> f32 {
  let offsetPoint = hitPoint + lightRight * offset.x * scene.shadowBlur + lightUp * offset.y * scene.shadowBlur;
  return traceShadow(offsetPoint, lightDir);
}

fn calcShadow(hitPoint: vec3f, lightDir: vec3f) -> f32 {
  if (scene.shadowBlur <= 0.0) {
    let shadowDist = traceShadow(hitPoint, lightDir);
    if (shadowDist > 0.0) {
      return 0.0;
    }
    return 1.0;
  }

  let basis = buildBasis(lightDir);
  let lightRight = basis[0];
  let lightUp = basis[1];

  var hitCount = 0;

  // 3x3 PCF sampling loop
  for (var y = -1; y <= 1; y++) {
    for (var x = -1; x <= 1; x++) {
      let offset = vec2f(f32(x), f32(y));
      let d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, offset);
      if (d > 0.0) {
        hitCount++;
      }
    }
  }

  if (hitCount == 0) {
    return 1.0;
  }

  return 1.0 - f32(hitCount) / f32(PCF_SAMPLE_COUNT);
}

struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

@vertex
fn vertexMain(@builtin(vertex_index) vertexIndex: u32) -> VertexOutput {
  // Full-screen quad (2 triangles)
  var positions = array<vec2f, 6>(
    vec2f(-1.0, -1.0),
    vec2f(1.0, -1.0),
    vec2f(-1.0, 1.0),
    vec2f(-1.0, 1.0),
    vec2f(1.0, -1.0),
    vec2f(1.0, 1.0)
  );

  var output: VertexOutput;
  output.position = vec4f(positions[vertexIndex], 0.0, 1.0);
  // Convert from clip space (-1 to 1) to UV (0 to 1)
  // Note: WebGPU Y is top-down, so flip V
  output.uv = positions[vertexIndex] * 0.5 + 0.5;
  output.uv.y = 1.0 - output.uv.y;
  return output;
}

// Calculate surface shading (ambient + diffuse with shadows)
fn calcShading(hitPoint: vec3f, surfaceColor: vec3f, normal: vec3f) -> vec3f {
  // Convert to linear space
  let linearSurfaceColor = srgbToLinear(surfaceColor);
  let linearAmbientColor = srgbToLinear(scene.ambientColor);

  // Ambient lighting
  var result = linearSurfaceColor * linearAmbientColor * scene.ambientIntensity;

  // Diffuse from directional lights
  for (var i = 0u; i < scene.lightCount; i++) {
    let light = lights[i];
    let NdotL = max(0.0, dot(normal, light.direction));

    if (NdotL > 0.0) {
      let linearLightColor = srgbToLinear(light.color);
      let shadow = calcShadow(hitPoint, light.direction);
      result += linearSurfaceColor * linearLightColor * light.intensity * NdotL * shadow;
    }
  }

  return result;
}

@fragment
fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
  // Generate ray from orthographic camera
  let offsetU = input.uv.x - 0.5;
  let offsetV = (1.0 - input.uv.y) - 0.5; // Flip back for ray calculation

  var currentOrigin = scene.camera.position
    + scene.camera.right * offsetU * scene.camera.width
    + scene.camera.up * offsetV * scene.camera.height;
  var currentDir = scene.camera.forward;

  // Accumulated color and transmittance for transparency
  var accumulatedColor = vec3f(0.0);
  var transmittance = 1.0;
  var currentIor = AIR_IOR;  // Track current medium's IOR

  // Iterative ray tracing for transparency/refraction
  for (var bounce = 0; bounce < MAX_BOUNCES; bounce++) {
    let hit = traceRay(currentOrigin, currentDir);

    // No hit - add background and exit
    if (hit.t >= MAX_DISTANCE) {
      accumulatedColor += transmittance * srgbToLinear(scene.backgroundColor);
      break;
    }

    let hitPoint = currentOrigin + hit.t * currentDir;

    // Calculate surface shading
    let surfaceShading = calcShading(hitPoint, hit.color, hit.normal);

    // Opaque surface - add color and exit
    if (hit.alpha >= 1.0) {
      accumulatedColor += transmittance * surfaceShading;
      break;
    }

    // Transparent surface - blend and continue
    let surfaceContribution = hit.alpha;
    accumulatedColor += transmittance * surfaceContribution * surfaceShading;
    transmittance *= (1.0 - surfaceContribution);

    // If transmittance is negligible, stop
    if (transmittance < 0.01) {
      break;
    }

    // Determine if entering or exiting the medium
    let cosTheta = dot(-currentDir, hit.normal);
    let entering = cosTheta > 0.0;

    var refractNormal: vec3f;
    var eta: f32;

    if (entering) {
      // Entering the medium (air -> material)
      refractNormal = hit.normal;
      eta = currentIor / hit.ior;
    } else {
      // Exiting the medium (material -> air)
      refractNormal = -hit.normal;
      eta = hit.ior / AIR_IOR;
    }

    // Calculate refraction
    let refractResult = calcRefraction(currentDir, refractNormal, eta);

    if (refractResult.w > 0.5) {
      // Refraction succeeded
      currentDir = refractResult.xyz;
      currentIor = select(hit.ior, AIR_IOR, entering);
    } else {
      // Total internal reflection - reflect instead
      currentDir = reflect(currentDir, refractNormal);
    }

    // Offset origin to avoid self-intersection
    currentOrigin = hitPoint + currentDir * SHADOW_OFFSET;
  }

  // Convert back to sRGB
  let finalColor = linearToSrgb(accumulatedColor);
  return vec4f(finalColor, 1.0);
}
