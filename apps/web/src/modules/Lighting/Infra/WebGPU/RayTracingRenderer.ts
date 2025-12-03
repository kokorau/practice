/**
 * WebGPU Ray Tracing Renderer
 * GPU でレイトレーシングを行う (WebGPU版)
 */

import type {
  OrthographicCamera,
  PlaneGeometry,
  BoxGeometry,
  CapsuleGeometry,
  Light,
  AmbientLight,
  DirectionalLight,
  Color,
} from '../../Domain/ValueObject'

// WGSL Shader
// Note: WGSL struct alignment rules:
// - vec3f is 16-byte aligned (not 12!)
// - mat3x3f is stored as 3 x vec4f (48 bytes, 16-byte aligned)
// - We use explicit padding to match TypeScript buffer layout
const SHADER_CODE = /* wgsl */ `
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
    color: vec3f,         // 32-43, pad 44-47
    _pad2: f32,
    size: vec2f,          // 48-55
    _pad3: vec2f,         // 56-63
  }

  // Box data (144 bytes)
  struct Box {
    center: vec3f,        // 0-11, pad 12-15
    _pad0: f32,
    size: vec3f,          // 16-27, pad 28-31
    _pad1: f32,
    color: vec3f,         // 32-43
    radius: f32,          // 44-47
    rotation: mat3x3f,    // 48-95 (3 x vec3f with padding = 48 bytes)
    rotationInv: mat3x3f, // 96-143
  }

  // Capsule data (48 bytes)
  struct Capsule {
    pointA: vec3f,        // 0-11, pad 12-15
    _pad0: f32,
    pointB: vec3f,        // 16-27, pad 28-31
    _pad1: f32,
    color: vec3f,         // 32-43
    radius: f32,          // 44-47
  }

  // Directional light (32 bytes)
  struct DirLight {
    direction: vec3f,     // 0-11, pad 12-15
    _pad0: f32,
    color: vec3f,         // 16-27
    intensity: f32,       // 28-31
  }

  // Scene uniforms (128 bytes -> 144 bytes with capsuleCount)
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
    _pad1: u32,               // 132-135
    _pad2: u32,               // 136-139
    _pad3: u32,               // 140-143
  }

  @group(0) @binding(0) var<uniform> scene: SceneUniforms;
  @group(0) @binding(1) var<storage, read> planes: array<Plane>;
  @group(0) @binding(2) var<storage, read> boxes: array<Box>;
  @group(0) @binding(3) var<storage, read> lights: array<DirLight>;
  @group(0) @binding(4) var<storage, read> capsules: array<Capsule>;

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
    return pow(srgb, vec3f(2.2));
  }

  // Linear to sRGB conversion
  fn linearToSrgb(linear: vec3f) -> vec3f {
    return pow(linear, vec3f(1.0 / 2.2));
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

  // Calculate normal from SDF
  fn calcRoundBoxNormal(p: vec3f, halfSize: vec3f, radius: f32) -> vec3f {
    let eps = 0.0001;
    return normalize(vec3f(
      sdRoundBox(p + vec3f(eps, 0.0, 0.0), halfSize, radius) - sdRoundBox(p - vec3f(eps, 0.0, 0.0), halfSize, radius),
      sdRoundBox(p + vec3f(0.0, eps, 0.0), halfSize, radius) - sdRoundBox(p - vec3f(0.0, eps, 0.0), halfSize, radius),
      sdRoundBox(p + vec3f(0.0, 0.0, eps), halfSize, radius) - sdRoundBox(p - vec3f(0.0, 0.0, eps), halfSize, radius)
    ));
  }

  // Ray-plane intersection
  fn intersectPlane(rayOrigin: vec3f, rayDir: vec3f, plane: Plane) -> f32 {
    let denom = dot(rayDir, plane.normal);
    if (abs(denom) < 1e-6) {
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
    let invDir = 1.0 / localDir;

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
    let invDir = 1.0 / localDir;
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
    var t = max(tNear - 0.001, 0.0);
    let MAX_STEPS = 128;
    let MIN_DIST = 0.0001;

    for (var i = 0; i < MAX_STEPS; i++) {
      let p = localOrigin + t * localDir;
      let d = sdRoundBox(p, halfSize, radius);

      if (d < MIN_DIST) {
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

  // Shadow ray (simplified, returns distance or -1)
  fn traceShadow(hitPoint: vec3f, lightDir: vec3f) -> f32 {
    let shadowOrigin = hitPoint + lightDir * 0.001;

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
    var d: f32;

    // 3x3 PCF sampling
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(-1.0, -1.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(0.0, -1.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(1.0, -1.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(-1.0, 0.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(0.0, 0.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(1.0, 0.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(-1.0, 1.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(0.0, 1.0));
    if (d > 0.0) { hitCount++; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2f(1.0, 1.0));
    if (d > 0.0) { hitCount++; }

    if (hitCount == 0) {
      return 1.0;
    }

    return 1.0 - f32(hitCount) / 9.0;
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

  @fragment
  fn fragmentMain(input: VertexOutput) -> @location(0) vec4f {
    // DEBUG: Show UV gradient to verify rendering works
    // return vec4f(input.uv.x, input.uv.y, 0.5, 1.0);

    // Generate ray from orthographic camera
    let offsetU = input.uv.x - 0.5;
    let offsetV = (1.0 - input.uv.y) - 0.5; // Flip back for ray calculation

    let rayOrigin = scene.camera.position
      + scene.camera.right * offsetU * scene.camera.width
      + scene.camera.up * offsetV * scene.camera.height;
    let rayDir = scene.camera.forward;

    // DEBUG: Verify camera data is being received
    // return vec4f(abs(rayDir), 1.0);

    // Find closest intersection
    var closestT: f32 = 1e10;
    var hitColor = scene.backgroundColor;
    var hitSurfaceColor = vec3f(0.0);
    var hitNormal = vec3f(0.0);
    var hasHit = false;

    // Check planes
    for (var i = 0u; i < scene.planeCount; i++) {
      let plane = planes[i];
      let t = intersectPlane(rayOrigin, rayDir, plane);

      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = plane.color;
        hitNormal = plane.normal;
        hasHit = true;
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
      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = box.color;

        if (box.radius > 0.0) {
          hitNormal = getRoundBoxNormal(box, rayOrigin, rayDir, t);
        } else {
          let localOrigin = box.rotation * (rayOrigin - box.center);
          let localDir = box.rotation * rayDir;
          let localHit = localOrigin + t * localDir;
          hitNormal = getBoxNormal(box, localHit, result.y);
        }
        hasHit = true;
      }
    }

    // Check capsules
    for (var i = 0u; i < scene.capsuleCount; i++) {
      let capsule = capsules[i];
      let t = intersectCapsule(rayOrigin, rayDir, capsule);

      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = capsule.color;
        let hitPoint = rayOrigin + t * rayDir;
        hitNormal = getCapsuleNormal(capsule, hitPoint);
        hasHit = true;
      }
    }

    if (hasHit) {
      let hitPoint = rayOrigin + closestT * rayDir;

      // Convert to linear space
      let linearSurfaceColor = srgbToLinear(hitSurfaceColor);
      let linearAmbientColor = srgbToLinear(scene.ambientColor);

      // Ambient lighting
      var ambient = linearSurfaceColor * linearAmbientColor * scene.ambientIntensity;

      // Diffuse from directional lights
      var diffuse = vec3f(0.0);
      for (var i = 0u; i < scene.lightCount; i++) {
        let light = lights[i];
        let NdotL = max(0.0, dot(hitNormal, light.direction));

        if (NdotL > 0.0) {
          let linearLightColor = srgbToLinear(light.color);
          let shadow = calcShadow(hitPoint, light.direction);
          diffuse += linearSurfaceColor * linearLightColor * light.intensity * NdotL * shadow;
        }
      }

      hitColor = linearToSrgb(ambient + diffuse);
    }

    return vec4f(hitColor, 1.0);
  }
`

export interface ScenePlane {
  type: 'plane'
  geometry: PlaneGeometry
  color: Color
}

export interface SceneBox {
  type: 'box'
  geometry: BoxGeometry
  color: Color
}

export interface SceneCapsule {
  type: 'capsule'
  geometry: CapsuleGeometry
  color: Color
}

export type SceneObject = ScenePlane | SceneBox | SceneCapsule

export const $SceneObject = {
  createPlane: (geometry: PlaneGeometry, color: Color): ScenePlane => ({
    type: 'plane',
    geometry,
    color,
  }),
  createBox: (geometry: BoxGeometry, color: Color): SceneBox => ({
    type: 'box',
    geometry,
    color,
  }),
  createCapsule: (geometry: CapsuleGeometry, color: Color): SceneCapsule => ({
    type: 'capsule',
    geometry,
    color,
  }),
}

export interface Scene {
  readonly objects: SceneObject[]
  readonly lights: Light[]
  readonly backgroundColor?: Color
  readonly shadowBlur?: number
}

type SceneItem = SceneObject | Light

const isLight = (item: SceneItem): item is Light =>
  item.type === 'ambient' || item.type === 'directional'

const isSceneObject = (item: SceneItem): item is SceneObject =>
  item.type === 'plane' || item.type === 'box' || item.type === 'capsule'

export const $Scene = {
  create: (params?: {
    objects?: SceneObject[]
    lights?: Light[]
    backgroundColor?: Color
    shadowBlur?: number
  }): Scene => ({
    objects: params?.objects ?? [],
    lights: params?.lights ?? [],
    backgroundColor: params?.backgroundColor,
    shadowBlur: params?.shadowBlur,
  }),

  add: (scene: Scene, ...items: SceneItem[]): Scene => {
    const newObjects = items.filter(isSceneObject)
    const newLights = items.filter(isLight)
    return {
      ...scene,
      objects: [...scene.objects, ...newObjects],
      lights: [...scene.lights, ...newLights],
    }
  },
}

// Check WebGPU support
export async function isWebGPUSupported(): Promise<boolean> {
  if (!navigator.gpu) {
    return false
  }
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter !== null
  } catch {
    return false
  }
}

export class RayTracingRenderer {
  private device: GPUDevice
  private context: GPUCanvasContext
  private pipeline: GPURenderPipeline
  private bindGroupLayout: GPUBindGroupLayout

  private sceneUniformBuffer: GPUBuffer
  private planeBuffer: GPUBuffer
  private boxBuffer: GPUBuffer
  private lightBuffer: GPUBuffer
  private capsuleBuffer: GPUBuffer

  private readonly MAX_PLANES = 32
  private readonly MAX_BOXES = 64
  private readonly MAX_LIGHTS = 4
  private readonly MAX_CAPSULES = 128

  private constructor(
    device: GPUDevice,
    context: GPUCanvasContext,
    pipeline: GPURenderPipeline,
    bindGroupLayout: GPUBindGroupLayout,
    sceneUniformBuffer: GPUBuffer,
    planeBuffer: GPUBuffer,
    boxBuffer: GPUBuffer,
    lightBuffer: GPUBuffer,
    capsuleBuffer: GPUBuffer
  ) {
    this.device = device
    this.context = context
    this.pipeline = pipeline
    this.bindGroupLayout = bindGroupLayout
    this.sceneUniformBuffer = sceneUniformBuffer
    this.planeBuffer = planeBuffer
    this.boxBuffer = boxBuffer
    this.lightBuffer = lightBuffer
    this.capsuleBuffer = capsuleBuffer
  }

  static async create(canvas: HTMLCanvasElement): Promise<RayTracingRenderer> {
    if (!navigator.gpu) {
      throw new Error('WebGPU not supported')
    }

    const adapter = await navigator.gpu.requestAdapter()
    if (!adapter) {
      throw new Error('No GPU adapter found')
    }

    const device = await adapter.requestDevice()

    const context = canvas.getContext('webgpu')
    if (!context) {
      throw new Error('Could not get WebGPU context')
    }

    const format = navigator.gpu.getPreferredCanvasFormat()
    context.configure({
      device,
      format,
      alphaMode: 'opaque',
    })

    // Create shader module
    const shaderModule = device.createShaderModule({
      code: SHADER_CODE,
    })

    // Create bind group layout
    const bindGroupLayout = device.createBindGroupLayout({
      entries: [
        {
          binding: 0,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'uniform' },
        },
        {
          binding: 1,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 2,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 3,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
        {
          binding: 4,
          visibility: GPUShaderStage.FRAGMENT,
          buffer: { type: 'read-only-storage' },
        },
      ],
    })

    // Create pipeline layout
    const pipelineLayout = device.createPipelineLayout({
      bindGroupLayouts: [bindGroupLayout],
    })

    // Create render pipeline
    const pipeline = device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: {
        module: shaderModule,
        entryPoint: 'vertexMain',
      },
      fragment: {
        module: shaderModule,
        entryPoint: 'fragmentMain',
        targets: [{ format }],
      },
      primitive: {
        topology: 'triangle-list',
      },
    })

    // Scene uniform buffer size calculation:
    // Camera: position(12) + pad(4) + forward(12) + pad(4) + right(12) + pad(4) + up(12) + pad(4) + width(4) + height(4) + pad(8) = 80
    // backgroundColor(12) + pad(4) = 16
    // ambientColor(12) + ambientIntensity(4) = 16
    // shadowBlur(4) + planeCount(4) + boxCount(4) + lightCount(4) = 16
    // capsuleCount(4) + pad(4) + pad(4) + pad(4) = 16
    // Total = 144 bytes
    const sceneUniformBuffer = device.createBuffer({
      size: 144,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    })

    // Plane buffer: each plane = point(12) + pad(4) + normal(12) + pad(4) + color(12) + pad(4) + size(8) + pad(8) = 64 bytes
    const MAX_PLANES = 32
    const planeBuffer = device.createBuffer({
      size: MAX_PLANES * 64,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Box buffer: each box = center(12) + pad(4) + size(12) + pad(4) + color(12) + radius(4) + rotation(48) + rotationInv(48) = 144 bytes
    const MAX_BOXES = 64
    const boxBuffer = device.createBuffer({
      size: MAX_BOXES * 144,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Light buffer: each light = direction(12) + pad(4) + color(12) + intensity(4) = 32 bytes
    const MAX_LIGHTS = 4
    const lightBuffer = device.createBuffer({
      size: MAX_LIGHTS * 32,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    // Capsule buffer: each capsule = pointA(12) + pad(4) + pointB(12) + pad(4) + color(12) + radius(4) = 48 bytes
    const MAX_CAPSULES = 128
    const capsuleBuffer = device.createBuffer({
      size: MAX_CAPSULES * 48,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    })

    return new RayTracingRenderer(
      device,
      context,
      pipeline,
      bindGroupLayout,
      sceneUniformBuffer,
      planeBuffer,
      boxBuffer,
      lightBuffer,
      capsuleBuffer
    )
  }

  private normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return { x: v.x / len, y: v.y / len, z: v.z / len }
  }

  private cross(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    }
  }

  private sub(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): { x: number; y: number; z: number } {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  }

  // Create rotation matrix from Euler angles (XYZ order)
  // Returns column-major mat3x3 for WGSL
  private eulerToMatrix(euler: { x: number; y: number; z: number }): Float32Array {
    const cx = Math.cos(euler.x),
      sx = Math.sin(euler.x)
    const cy = Math.cos(euler.y),
      sy = Math.sin(euler.y)
    const cz = Math.cos(euler.z),
      sz = Math.sin(euler.z)

    // mat3x3 in WGSL is column-major, each column is vec3f (padded to 16 bytes)
    // So we need 3 columns × 4 floats = 12 floats (48 bytes)
    return new Float32Array([
      cy * cz,
      cy * sz,
      -sy,
      0, // column 0 + padding
      sx * sy * cz - cx * sz,
      sx * sy * sz + cx * cz,
      sx * cy,
      0, // column 1 + padding
      cx * sy * cz + sx * sz,
      cx * sy * sz - sx * cz,
      cx * cy,
      0, // column 2 + padding
    ])
  }

  private eulerToMatrixInverse(euler: { x: number; y: number; z: number }): Float32Array {
    const cx = Math.cos(euler.x),
      sx = Math.sin(euler.x)
    const cy = Math.cos(euler.y),
      sy = Math.sin(euler.y)
    const cz = Math.cos(euler.z),
      sz = Math.sin(euler.z)

    // Transpose of rotation matrix (column-major with padding)
    return new Float32Array([
      cy * cz,
      sx * sy * cz - cx * sz,
      cx * sy * cz + sx * sz,
      0,
      cy * sz,
      sx * sy * sz + cx * cz,
      cx * sy * sz - sx * cz,
      0,
      -sy,
      sx * cy,
      cx * cy,
      0,
    ])
  }

  render(scene: Scene, camera: OrthographicCamera): void {
    const {
      objects,
      lights,
      backgroundColor = { r: 20 / 255, g: 20 / 255, b: 40 / 255 },
      shadowBlur = 0,
    } = scene

    // Separate objects by type
    const planes = objects.filter((o): o is ScenePlane => o.type === 'plane')
    const boxes = objects.filter((o): o is SceneBox => o.type === 'box')
    const capsules = objects.filter((o): o is SceneCapsule => o.type === 'capsule')

    // Separate lights by type
    const ambientLight = lights.find((l): l is AmbientLight => l.type === 'ambient') ?? {
      type: 'ambient' as const,
      color: { r: 1, g: 1, b: 1 },
      intensity: 1,
    }
    const directionalLights = lights.filter(
      (l): l is DirectionalLight => l.type === 'directional'
    )

    // Calculate camera basis vectors
    const forward = this.normalize(this.sub(camera.lookAt, camera.position))
    const right = this.normalize(this.cross(camera.up, forward))
    const up = this.cross(forward, right)

    // Build scene uniform buffer
    const sceneData = new Float32Array(36) // 144 bytes / 4 = 36 floats
    let offset = 0

    // Camera (80 bytes = 20 floats)
    sceneData[offset++] = camera.position.x
    sceneData[offset++] = camera.position.y
    sceneData[offset++] = camera.position.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = forward.x
    sceneData[offset++] = forward.y
    sceneData[offset++] = forward.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = right.x
    sceneData[offset++] = right.y
    sceneData[offset++] = right.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = up.x
    sceneData[offset++] = up.y
    sceneData[offset++] = up.z
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = camera.width
    sceneData[offset++] = camera.height
    sceneData[offset++] = 0 // padding
    sceneData[offset++] = 0 // padding

    // backgroundColor (16 bytes = 4 floats)
    sceneData[offset++] = backgroundColor.r
    sceneData[offset++] = backgroundColor.g
    sceneData[offset++] = backgroundColor.b
    sceneData[offset++] = 0 // padding

    // ambientColor + intensity (16 bytes = 4 floats)
    sceneData[offset++] = ambientLight.color.r
    sceneData[offset++] = ambientLight.color.g
    sceneData[offset++] = ambientLight.color.b
    sceneData[offset++] = ambientLight.intensity

    // shadowBlur + counts (16 bytes = 4 u32/f32)
    const sceneDataView = new DataView(sceneData.buffer)
    sceneDataView.setFloat32(offset * 4, shadowBlur, true)
    offset++
    sceneDataView.setUint32(offset * 4, Math.min(planes.length, this.MAX_PLANES), true)
    offset++
    sceneDataView.setUint32(offset * 4, Math.min(boxes.length, this.MAX_BOXES), true)
    offset++
    sceneDataView.setUint32(
      offset * 4,
      Math.min(directionalLights.length, this.MAX_LIGHTS),
      true
    )
    offset++

    // capsuleCount + padding (16 bytes = 4 u32)
    sceneDataView.setUint32(offset * 4, Math.min(capsules.length, this.MAX_CAPSULES), true)
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding
    offset++
    sceneDataView.setUint32(offset * 4, 0, true) // padding

    this.device.queue.writeBuffer(this.sceneUniformBuffer, 0, sceneData)

    // Build plane buffer (64 bytes per plane)
    const planeCount = Math.min(planes.length, this.MAX_PLANES)
    const planeData = new Float32Array(this.MAX_PLANES * 16) // 64 bytes = 16 floats per plane
    for (let i = 0; i < planeCount; i++) {
      const plane = planes[i]!
      const base = i * 16
      // point
      planeData[base + 0] = plane.geometry.point.x
      planeData[base + 1] = plane.geometry.point.y
      planeData[base + 2] = plane.geometry.point.z
      planeData[base + 3] = 0 // padding
      // normal
      planeData[base + 4] = plane.geometry.normal.x
      planeData[base + 5] = plane.geometry.normal.y
      planeData[base + 6] = plane.geometry.normal.z
      planeData[base + 7] = 0 // padding
      // color
      planeData[base + 8] = plane.color.r
      planeData[base + 9] = plane.color.g
      planeData[base + 10] = plane.color.b
      planeData[base + 11] = 0 // padding
      // size
      planeData[base + 12] = plane.geometry.width ?? -1
      planeData[base + 13] = plane.geometry.height ?? -1
      planeData[base + 14] = 0 // padding
      planeData[base + 15] = 0 // padding
    }
    this.device.queue.writeBuffer(this.planeBuffer, 0, planeData)

    // Build box buffer (144 bytes per box = 36 floats)
    const boxCount = Math.min(boxes.length, this.MAX_BOXES)
    const boxData = new Float32Array(this.MAX_BOXES * 36)
    const identityEuler = { x: 0, y: 0, z: 0 }

    for (let i = 0; i < this.MAX_BOXES; i++) {
      const base = i * 36
      if (i < boxCount) {
        const box = boxes[i]!
        // center
        boxData[base + 0] = box.geometry.center.x
        boxData[base + 1] = box.geometry.center.y
        boxData[base + 2] = box.geometry.center.z
        boxData[base + 3] = 0 // padding
        // size
        boxData[base + 4] = box.geometry.size.x
        boxData[base + 5] = box.geometry.size.y
        boxData[base + 6] = box.geometry.size.z
        boxData[base + 7] = 0 // padding
        // color + radius
        boxData[base + 8] = box.color.r
        boxData[base + 9] = box.color.g
        boxData[base + 10] = box.color.b
        boxData[base + 11] = box.geometry.radius ?? 0
        // rotation matrix (12 floats with padding)
        const euler = box.geometry.rotation ?? identityEuler
        const rotMatrix = this.eulerToMatrix(euler)
        boxData.set(rotMatrix, base + 12)
        // inverse rotation matrix (12 floats with padding)
        const rotMatrixInv = this.eulerToMatrixInverse(euler)
        boxData.set(rotMatrixInv, base + 24)
      } else {
        // Identity matrices for unused boxes
        const identity = this.eulerToMatrix(identityEuler)
        boxData.set(identity, base + 12)
        boxData.set(identity, base + 24)
      }
    }
    this.device.queue.writeBuffer(this.boxBuffer, 0, boxData)

    // Build light buffer (32 bytes per light = 8 floats)
    const lightCount = Math.min(directionalLights.length, this.MAX_LIGHTS)
    const lightData = new Float32Array(this.MAX_LIGHTS * 8)
    for (let i = 0; i < lightCount; i++) {
      const light = directionalLights[i]!
      const base = i * 8
      // Normalize and negate direction (shader expects direction TO the light)
      const dir = this.normalize(light.direction)
      lightData[base + 0] = -dir.x
      lightData[base + 1] = -dir.y
      lightData[base + 2] = -dir.z
      lightData[base + 3] = 0 // padding
      // color + intensity
      lightData[base + 4] = light.color.r
      lightData[base + 5] = light.color.g
      lightData[base + 6] = light.color.b
      lightData[base + 7] = light.intensity
    }
    this.device.queue.writeBuffer(this.lightBuffer, 0, lightData)

    // Build capsule buffer (48 bytes per capsule = 12 floats)
    const capsuleCount = Math.min(capsules.length, this.MAX_CAPSULES)
    const capsuleData = new Float32Array(this.MAX_CAPSULES * 12)
    for (let i = 0; i < capsuleCount; i++) {
      const capsule = capsules[i]!
      const base = i * 12
      // pointA
      capsuleData[base + 0] = capsule.geometry.pointA.x
      capsuleData[base + 1] = capsule.geometry.pointA.y
      capsuleData[base + 2] = capsule.geometry.pointA.z
      capsuleData[base + 3] = 0 // padding
      // pointB
      capsuleData[base + 4] = capsule.geometry.pointB.x
      capsuleData[base + 5] = capsule.geometry.pointB.y
      capsuleData[base + 6] = capsule.geometry.pointB.z
      capsuleData[base + 7] = 0 // padding
      // color + radius
      capsuleData[base + 8] = capsule.color.r
      capsuleData[base + 9] = capsule.color.g
      capsuleData[base + 10] = capsule.color.b
      capsuleData[base + 11] = capsule.geometry.radius
    }
    this.device.queue.writeBuffer(this.capsuleBuffer, 0, capsuleData)

    // Create bind group
    const bindGroup = this.device.createBindGroup({
      layout: this.bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: this.sceneUniformBuffer } },
        { binding: 1, resource: { buffer: this.planeBuffer } },
        { binding: 2, resource: { buffer: this.boxBuffer } },
        { binding: 3, resource: { buffer: this.lightBuffer } },
        { binding: 4, resource: { buffer: this.capsuleBuffer } },
      ],
    })

    // Render
    const commandEncoder = this.device.createCommandEncoder()
    const textureView = this.context.getCurrentTexture().createView()

    const renderPass = commandEncoder.beginRenderPass({
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    })

    renderPass.setPipeline(this.pipeline)
    renderPass.setBindGroup(0, bindGroup)
    renderPass.draw(6) // 6 vertices for full-screen quad
    renderPass.end()

    this.device.queue.submit([commandEncoder.finish()])
  }

  dispose(): void {
    this.sceneUniformBuffer.destroy()
    this.planeBuffer.destroy()
    this.boxBuffer.destroy()
    this.lightBuffer.destroy()
    this.capsuleBuffer.destroy()
  }
}
