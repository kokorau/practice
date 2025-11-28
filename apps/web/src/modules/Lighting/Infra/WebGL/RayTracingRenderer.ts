/**
 * WebGL Ray Tracing Renderer
 * GPU でレイトレーシングを行う
 */

import type { OrthographicCamera, PlaneGeometry, BoxGeometry, Light, AmbientLight, DirectionalLight, Color } from '../../Domain/ValueObject'

// Vertex Shader - フルスクリーンクワッド
const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Convert from clip space (-1 to 1) to UV (0 to 1)
    v_uv = a_position * 0.5 + 0.5;
  }
`

// Fragment Shader - レイトレーシング (split into parts for injection)
const FRAGMENT_SHADER_HEADER = `
  precision highp float;

  varying vec2 v_uv;

  // Camera uniforms
  uniform vec3 u_cameraPosition;
  uniform vec3 u_cameraForward;
  uniform vec3 u_cameraRight;
  uniform vec3 u_cameraUp;
  uniform float u_cameraWidth;
  uniform float u_cameraHeight;

  // Plane uniforms (max 32 planes)
  const int MAX_PLANES = 32;
  uniform int u_planeCount;
  uniform vec3 u_planePoints[MAX_PLANES];
  uniform vec3 u_planeNormals[MAX_PLANES];
  uniform vec3 u_planeColors[MAX_PLANES];
  uniform vec2 u_planeSizes[MAX_PLANES]; // width, height (-1 = infinite)

  // Box uniforms (max 64 boxes)
  const int MAX_BOXES = 64;
  uniform int u_boxCount;
  uniform vec3 u_boxCenters[MAX_BOXES];
  uniform vec3 u_boxSizes[MAX_BOXES];
  uniform vec3 u_boxColors[MAX_BOXES];
  uniform float u_boxRadii[MAX_BOXES]; // Corner radius for rounded boxes
  uniform mat3 u_boxRotations[MAX_BOXES]; // Rotation matrices (world -> local)
  uniform mat3 u_boxRotationsInv[MAX_BOXES]; // Inverse rotation matrices (local -> world)

  // Ambient light
  uniform vec3 u_ambientColor;
  uniform float u_ambientIntensity;

  // Directional lights (max 4)
  const int MAX_LIGHTS = 4;
  uniform int u_lightCount;
  uniform vec3 u_lightDirs[MAX_LIGHTS]; // Direction TO the light (normalized)
  uniform vec3 u_lightColors[MAX_LIGHTS];
  uniform float u_lightIntensities[MAX_LIGHTS];

  // Background color
  uniform vec3 u_backgroundColor;

  // Shadow blur radius (world units)
  uniform float u_shadowBlur;

  // Build orthonormal basis from normal
  void buildBasis(vec3 normal, out vec3 right, out vec3 up) {
    vec3 tmp = abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    right = normalize(cross(tmp, normal));
    up = cross(normal, right);
  }

  // sRGB to Linear conversion (gamma removal)
  vec3 srgbToLinear(vec3 srgb) {
    return pow(srgb, vec3(2.2));
  }

  // Linear to sRGB conversion (gamma application)
  vec3 linearToSrgb(vec3 linear) {
    return pow(linear, vec3(1.0 / 2.2));
  }

  // Simple hash function for noise
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  // 2D noise
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f); // smoothstep
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  // Signed Distance Function for rounded box (full 3D)
  // p: point in local space (box centered at origin)
  // b: half-size of the box
  // r: corner radius
  float sdRoundBox3D(vec3 p, vec3 b, float r) {
    vec3 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
  }

  // Signed Distance Function for 2D rounded box (XY plane only)
  // For flat boxes viewed from front, only round XY corners
  float sdRoundBox2D(vec3 p, vec3 b, float r) {
    // 2D rounded rect in XY, extruded in Z
    vec2 q = abs(p.xy) - b.xy + r;
    float d2d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
    float dz = abs(p.z) - b.z;
    return max(d2d, dz);
  }

  // Use 2D version for flat boxes (when z dimension is small relative to radius)
  float sdRoundBox(vec3 p, vec3 b, float r) {
    // If box is thin in Z (like our HTML elements), use 2D rounding
    if (b.z < r * 2.0) {
      return sdRoundBox2D(p, b, r);
    }
    return sdRoundBox3D(p, b, r);
  }

  // Calculate normal from SDF using gradient
  vec3 calcRoundBoxNormal(vec3 p, vec3 halfSize, float radius) {
    const float eps = 0.0001;
    return normalize(vec3(
      sdRoundBox(p + vec3(eps, 0.0, 0.0), halfSize, radius) - sdRoundBox(p - vec3(eps, 0.0, 0.0), halfSize, radius),
      sdRoundBox(p + vec3(0.0, eps, 0.0), halfSize, radius) - sdRoundBox(p - vec3(0.0, eps, 0.0), halfSize, radius),
      sdRoundBox(p + vec3(0.0, 0.0, eps), halfSize, radius) - sdRoundBox(p - vec3(0.0, 0.0, eps), halfSize, radius)
    ));
  }

  // Ray-RoundBox intersection using ray marching
  // Returns t (distance), or -1.0 if no hit
  float intersectRoundBox(vec3 rayOrigin, vec3 rayDir, vec3 boxCenter, vec3 boxSize, float radius, mat3 rotMatrix, mat3 rotMatrixInv, out vec3 normal) {
    // Transform ray to box local space
    vec3 localOrigin = rotMatrix * (rayOrigin - boxCenter);
    vec3 localDir = normalize(rotMatrix * rayDir);
    vec3 halfSize = boxSize * 0.5;

    // First, do a quick AABB check to get approximate bounds
    vec3 invDir = 1.0 / localDir;
    vec3 t1 = (-halfSize - radius - localOrigin) * invDir;
    vec3 t2 = (halfSize + radius - localOrigin) * invDir;
    vec3 tMin = min(t1, t2);
    vec3 tMax = max(t1, t2);
    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);

    if (tNear > tFar || tFar < 0.0) {
      return -1.0;
    }

    // Start ray marching from tNear (or 0 if inside)
    float t = max(tNear - 0.001, 0.0);
    const int MAX_STEPS = 128;
    const float MIN_DIST = 0.0001;

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = localOrigin + t * localDir;
      float d = sdRoundBox(p, halfSize, radius);

      if (d < MIN_DIST) {
        // Hit! Calculate normal in local space then transform to world
        vec3 localNormal = calcRoundBoxNormal(p, halfSize, radius);
        normal = normalize(rotMatrixInv * localNormal);
        return t;
      }

      t += d;

      if (t > tFar) {
        break;
      }
    }

    return -1.0;
  }

  // Ray-RoundBox intersection without normal (for shadow rays)
  float intersectRoundBoxSimple(vec3 rayOrigin, vec3 rayDir, vec3 boxCenter, vec3 boxSize, float radius, mat3 rotMatrix) {
    vec3 localOrigin = rotMatrix * (rayOrigin - boxCenter);
    vec3 localDir = normalize(rotMatrix * rayDir);
    vec3 halfSize = boxSize * 0.5;

    // Quick AABB bounds check
    vec3 invDir = 1.0 / localDir;
    vec3 t1 = (-halfSize - radius - localOrigin) * invDir;
    vec3 t2 = (halfSize + radius - localOrigin) * invDir;
    vec3 tMin = min(t1, t2);
    vec3 tMax = max(t1, t2);
    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);

    if (tNear > tFar || tFar < 0.0) {
      return -1.0;
    }

    float t = max(tNear - 0.001, 0.0);
    const int MAX_STEPS = 64;
    const float MIN_DIST = 0.001;

    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 p = localOrigin + t * localDir;
      float d = sdRoundBox(p, halfSize, radius);

      if (d < MIN_DIST) {
        return t;
      }

      t += d;

      if (t > tFar) {
        break;
      }
    }

    return -1.0;
  }

  // Ray-plane intersection
  // Returns t (distance), or -1.0 if no hit
  float intersectPlane(vec3 rayOrigin, vec3 rayDir, vec3 planePoint, vec3 planeNormal, vec2 planeSize) {
    float denom = dot(rayDir, planeNormal);

    // Ray is parallel to plane
    if (abs(denom) < 1e-6) {
      return -1.0;
    }

    vec3 diff = planePoint - rayOrigin;
    float t = dot(diff, planeNormal) / denom;

    // Intersection is behind ray origin
    if (t < 0.0) {
      return -1.0;
    }

    // Check bounds if plane has finite size
    if (planeSize.x > 0.0 || planeSize.y > 0.0) {
      vec3 hitPoint = rayOrigin + t * rayDir;
      vec3 localOffset = hitPoint - planePoint;

      vec3 right, up;
      buildBasis(planeNormal, right, up);

      float u = dot(localOffset, right);
      float v = dot(localOffset, up);

      float halfWidth = planeSize.x > 0.0 ? planeSize.x * 0.5 : 1e10;
      float halfHeight = planeSize.y > 0.0 ? planeSize.y * 0.5 : 1e10;

      if (abs(u) > halfWidth || abs(v) > halfHeight) {
        return -1.0;
      }
    }

    return t;
  }

  // Ray-OBB intersection (Oriented Bounding Box)
  // Transform ray to box local space, then do AABB test
  // Returns t (distance), or -1.0 if no hit
  // Also outputs the hit normal in world space
  float intersectBox(vec3 rayOrigin, vec3 rayDir, vec3 boxCenter, vec3 boxSize, mat3 rotMatrix, mat3 rotMatrixInv, out vec3 normal) {
    // Transform ray to box local space
    vec3 localOrigin = rotMatrix * (rayOrigin - boxCenter);
    vec3 localDir = rotMatrix * rayDir;

    // AABB intersection in local space (centered at origin)
    vec3 halfSize = boxSize * 0.5;
    vec3 boxMin = -halfSize;
    vec3 boxMax = halfSize;

    vec3 invDir = 1.0 / localDir;

    vec3 t1 = (boxMin - localOrigin) * invDir;
    vec3 t2 = (boxMax - localOrigin) * invDir;

    vec3 tMin = min(t1, t2);
    vec3 tMax = max(t1, t2);

    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);

    if (tNear > tFar || tFar < 0.0) {
      return -1.0;
    }

    float t = tNear > 0.0 ? tNear : tFar;

    // Calculate local normal based on which face was hit
    vec3 hitPoint = localOrigin + t * localDir;
    vec3 localNormal = vec3(0.0);

    // Find which face was hit by checking which component is closest to the box surface
    vec3 d = abs(hitPoint) - halfSize;
    if (d.x > d.y && d.x > d.z) {
      localNormal = vec3(sign(hitPoint.x), 0.0, 0.0);
    } else if (d.y > d.z) {
      localNormal = vec3(0.0, sign(hitPoint.y), 0.0);
    } else {
      localNormal = vec3(0.0, 0.0, sign(hitPoint.z));
    }

    // Transform normal back to world space
    normal = normalize(rotMatrixInv * localNormal);

    return t;
  }

  // Ray-OBB intersection without normal calculation (for shadow rays)
  float intersectBoxSimple(vec3 rayOrigin, vec3 rayDir, vec3 boxCenter, vec3 boxSize, mat3 rotMatrix) {
    vec3 localOrigin = rotMatrix * (rayOrigin - boxCenter);
    vec3 localDir = rotMatrix * rayDir;

    vec3 halfSize = boxSize * 0.5;
    vec3 invDir = 1.0 / localDir;

    vec3 t1 = (-halfSize - localOrigin) * invDir;
    vec3 t2 = (halfSize - localOrigin) * invDir;

    vec3 tMin = min(t1, t2);
    vec3 tMax = max(t1, t2);

    float tNear = max(max(tMin.x, tMin.y), tMin.z);
    float tFar = min(min(tMax.x, tMax.y), tMax.z);

    if (tNear > tFar || tFar < 0.0) {
      return -1.0;
    }

    return tNear > 0.0 ? tNear : tFar;
  }

  // Calculate shadow - returns shadow distance (>0 if in shadow, -1.0 if not)
  // Note: Only checks boxes for shadow casting (planes like background don't cast shadows)
  float traceShadow(vec3 hitPoint, vec3 lightDir) {
    // Offset slightly along normal to avoid self-intersection
    vec3 shadowOrigin = hitPoint + lightDir * 0.001;

    // Check boxes only (planes like background don't cast shadows)
    for (int i = 0; i < MAX_BOXES; i++) {
      if (i >= u_boxCount) break;
      float radius = u_boxRadii[i];
      float t;
      if (radius > 0.0) {
        t = intersectRoundBoxSimple(shadowOrigin, lightDir, u_boxCenters[i], u_boxSizes[i], radius, u_boxRotations[i]);
      } else {
        t = intersectBoxSimple(shadowOrigin, lightDir, u_boxCenters[i], u_boxSizes[i], u_boxRotations[i]);
      }
      if (t > 0.0) {
        return t;
      }
    }

    return -1.0; // No shadow
  }
`

// Default shadow shader - no effect, just returns baseShadow
const DEFAULT_SHADOW_SHADER = `
  float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance) {
    return baseShadow;
  }
`

// Fragment shader body after applyShadow injection point
const FRAGMENT_SHADER_BODY = `
  // PCF shadow sampling helper - sample shadow at offset
  float sampleShadowAt(vec3 hitPoint, vec3 lightDir, vec3 lightRight, vec3 lightUp, vec2 offset) {
    vec3 offsetPoint = hitPoint + lightRight * offset.x * u_shadowBlur + lightUp * offset.y * u_shadowBlur;
    return traceShadow(offsetPoint, lightDir);
  }

  // Calculate shadow intensity using PCF (Percentage Closer Filtering)
  float calcShadow(vec3 hitPoint, vec3 lightDir, vec2 screenUV) {
    // If no blur, use single sample for performance
    if (u_shadowBlur <= 0.0) {
      float shadowDist = traceShadow(hitPoint, lightDir);
      if (shadowDist > 0.0) {
        return applyShadow(0.0, hitPoint, screenUV, shadowDist);
      }
      return 1.0;
    }

    // Build basis vectors perpendicular to light direction for PCF sampling
    vec3 lightRight, lightUp;
    buildBasis(lightDir, lightRight, lightUp);

    // Sample 9 points in a 3x3 grid pattern (unrolled for GLSL ES 1.00 compatibility)
    float totalDist = 0.0;
    int hitCount = 0;
    float d;

    // Row 1: y = -1
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2(-1.0, -1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 0.0, -1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 1.0, -1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }

    // Row 2: y = 0
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2(-1.0, 0.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 0.0, 0.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 1.0, 0.0));
    if (d > 0.0) { hitCount++; totalDist += d; }

    // Row 3: y = 1
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2(-1.0, 1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 0.0, 1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }
    d = sampleShadowAt(hitPoint, lightDir, lightRight, lightUp, vec2( 1.0, 1.0));
    if (d > 0.0) { hitCount++; totalDist += d; }

    // No shadow hits
    if (hitCount == 0) {
      return 1.0;
    }

    // Calculate average shadow
    float avgDist = totalDist / float(hitCount);
    float shadowRatio = float(hitCount) / 9.0;

    // Apply custom shadow shader with the shadow ratio as baseShadow
    float baseShadow = 1.0 - shadowRatio; // 0 = full shadow, 1 = no shadow
    return applyShadow(baseShadow, hitPoint, screenUV, avgDist);
  }

  void main() {
    // Generate ray from orthographic camera
    float offsetU = v_uv.x - 0.5;
    float offsetV = v_uv.y - 0.5;

    vec3 rayOrigin = u_cameraPosition
      + u_cameraRight * offsetU * u_cameraWidth
      + u_cameraUp * offsetV * u_cameraHeight;
    vec3 rayDir = u_cameraForward;

    // Find closest intersection
    float closestT = 1e10;
    vec3 hitColor = u_backgroundColor;
    vec3 hitSurfaceColor = vec3(0.0);
    vec3 hitNormal = vec3(0.0);
    bool hasHit = false;

    // Check planes
    for (int i = 0; i < MAX_PLANES; i++) {
      if (i >= u_planeCount) break;

      float t = intersectPlane(
        rayOrigin,
        rayDir,
        u_planePoints[i],
        u_planeNormals[i],
        u_planeSizes[i]
      );

      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = u_planeColors[i];
        hitNormal = u_planeNormals[i];
        hasHit = true;
      }
    }

    // Check boxes (use rounded or sharp depending on radius)
    for (int i = 0; i < MAX_BOXES; i++) {
      if (i >= u_boxCount) break;

      vec3 boxNormal;
      float radius = u_boxRadii[i];
      float t;

      if (radius > 0.0) {
        t = intersectRoundBox(
          rayOrigin,
          rayDir,
          u_boxCenters[i],
          u_boxSizes[i],
          radius,
          u_boxRotations[i],
          u_boxRotationsInv[i],
          boxNormal
        );
      } else {
        t = intersectBox(
          rayOrigin,
          rayDir,
          u_boxCenters[i],
          u_boxSizes[i],
          u_boxRotations[i],
          u_boxRotationsInv[i],
          boxNormal
        );
      }

      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = u_boxColors[i];
        hitNormal = boxNormal;
        hasHit = true;
      }
    }

    if (hasHit) {
      vec3 hitPoint = rayOrigin + closestT * rayDir;

      // Convert surface color from sRGB to linear for correct lighting calculation
      vec3 linearSurfaceColor = srgbToLinear(hitSurfaceColor);
      vec3 linearAmbientColor = srgbToLinear(u_ambientColor);

      // Ambient lighting (always applied)
      vec3 ambient = linearSurfaceColor * linearAmbientColor * u_ambientIntensity;

      // Accumulate diffuse from all directional lights
      vec3 diffuse = vec3(0.0);
      for (int i = 0; i < MAX_LIGHTS; i++) {
        if (i >= u_lightCount) break;

        vec3 lightDir = u_lightDirs[i];
        float NdotL = max(0.0, dot(hitNormal, lightDir));

        if (NdotL > 0.0) {
          vec3 linearLightColor = srgbToLinear(u_lightColors[i]);
          float shadow = calcShadow(hitPoint, lightDir, v_uv);
          diffuse += linearSurfaceColor * linearLightColor * u_lightIntensities[i] * NdotL * shadow;
        }
      }

      // Calculate final color in linear space, then convert back to sRGB
      hitColor = linearToSrgb(ambient + diffuse);
    }

    gl_FragColor = vec4(hitColor, 1.0);
  }
`

// Build complete fragment shader with injected applyShadow function
const buildFragmentShader = (shadowShader?: string): string => {
  const applyShadow = shadowShader ?? DEFAULT_SHADOW_SHADER
  return FRAGMENT_SHADER_HEADER + applyShadow + FRAGMENT_SHADER_BODY
}

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

export type SceneObject = ScenePlane | SceneBox

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
}

/**
 * Custom shadow shader GLSL function signature:
 * float applyShadow(float baseShadow, vec3 hitPoint, vec2 screenUV, float shadowDistance)
 * - baseShadow: 0.0 (in shadow) or 1.0 (no shadow)
 * - hitPoint: world position of the surface being shaded
 * - screenUV: screen coordinates (0-1)
 * - shadowDistance: distance to the shadow-casting object
 * - returns: modified shadow value (0.0-1.0)
 */
export interface Scene {
  readonly objects: SceneObject[]
  readonly lights: Light[]
  readonly backgroundColor?: Color
  readonly shadowShader?: string  // Custom GLSL applyShadow function
  readonly shadowBlur?: number    // Shadow blur radius in world units (0 = sharp, default)
}

type SceneItem = SceneObject | Light

const isLight = (item: SceneItem): item is Light =>
  item.type === 'ambient' || item.type === 'directional'

const isSceneObject = (item: SceneItem): item is SceneObject =>
  item.type === 'plane' || item.type === 'box'

export const $Scene = {
  create: (params?: {
    objects?: SceneObject[]
    lights?: Light[]
    backgroundColor?: Color
    shadowShader?: string
    shadowBlur?: number
  }): Scene => ({
    objects: params?.objects ?? [],
    lights: params?.lights ?? [],
    backgroundColor: params?.backgroundColor,
    shadowShader: params?.shadowShader,
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

export class RayTracingRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private positionBuffer: WebGLBuffer
  private currentShadowShader: string | undefined

  private uniforms!: {
    cameraPosition: WebGLUniformLocation
    cameraForward: WebGLUniformLocation
    cameraRight: WebGLUniformLocation
    cameraUp: WebGLUniformLocation
    cameraWidth: WebGLUniformLocation
    cameraHeight: WebGLUniformLocation
    planeCount: WebGLUniformLocation
    planePoints: WebGLUniformLocation
    planeNormals: WebGLUniformLocation
    planeColors: WebGLUniformLocation
    planeSizes: WebGLUniformLocation
    boxCount: WebGLUniformLocation
    boxCenters: WebGLUniformLocation
    boxSizes: WebGLUniformLocation
    boxColors: WebGLUniformLocation
    boxRadii: WebGLUniformLocation
    boxRotations: WebGLUniformLocation[]
    boxRotationsInv: WebGLUniformLocation[]
    ambientColor: WebGLUniformLocation
    ambientIntensity: WebGLUniformLocation
    lightCount: WebGLUniformLocation
    lightDirs: WebGLUniformLocation
    lightColors: WebGLUniformLocation
    lightIntensities: WebGLUniformLocation
    backgroundColor: WebGLUniformLocation
    shadowBlur: WebGLUniformLocation
  }

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: true,
    })

    if (!gl) {
      throw new Error('WebGL not supported')
    }

    this.gl = gl
    this.program = this.createProgram()
    this.positionBuffer = this.createPositionBuffer()
    this.uniforms = this.getUniformLocations()

    this.setupVertexAttributes()
  }

  private createShader(type: number, source: string): WebGLShader {
    const gl = this.gl
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Shader compile error: ${error}`)
    }

    return shader
  }

  private createProgram(shadowShader?: string): WebGLProgram {
    const gl = this.gl
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShaderSource = buildFragmentShader(shadowShader)
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentShaderSource)

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program)
      throw new Error(`Program link error: ${error}`)
    }

    gl.useProgram(program)
    this.currentShadowShader = shadowShader
    return program
  }

  private recompileIfNeeded(shadowShader?: string): void {
    if (this.currentShadowShader === shadowShader) {
      return
    }

    // Delete old program and create new one with updated shader
    const gl = this.gl
    gl.deleteProgram(this.program)
    this.program = this.createProgram(shadowShader)
    this.uniforms = this.getUniformLocations()
    this.setupVertexAttributes()
  }

  private createPositionBuffer(): WebGLBuffer {
    const gl = this.gl
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // Full-screen quad (two triangles)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1,
      ]),
      gl.STATIC_DRAW
    )
    return buffer
  }

  private getUniformLocations() {
    const gl = this.gl
    const maxBoxes = 64

    // Get mat3 array uniform locations for each element
    const boxRotations: WebGLUniformLocation[] = []
    const boxRotationsInv: WebGLUniformLocation[] = []
    for (let i = 0; i < maxBoxes; i++) {
      boxRotations.push(gl.getUniformLocation(this.program, `u_boxRotations[${i}]`)!)
      boxRotationsInv.push(gl.getUniformLocation(this.program, `u_boxRotationsInv[${i}]`)!)
    }

    return {
      cameraPosition: gl.getUniformLocation(this.program, 'u_cameraPosition')!,
      cameraForward: gl.getUniformLocation(this.program, 'u_cameraForward')!,
      cameraRight: gl.getUniformLocation(this.program, 'u_cameraRight')!,
      cameraUp: gl.getUniformLocation(this.program, 'u_cameraUp')!,
      cameraWidth: gl.getUniformLocation(this.program, 'u_cameraWidth')!,
      cameraHeight: gl.getUniformLocation(this.program, 'u_cameraHeight')!,
      planeCount: gl.getUniformLocation(this.program, 'u_planeCount')!,
      planePoints: gl.getUniformLocation(this.program, 'u_planePoints')!,
      planeNormals: gl.getUniformLocation(this.program, 'u_planeNormals')!,
      planeColors: gl.getUniformLocation(this.program, 'u_planeColors')!,
      planeSizes: gl.getUniformLocation(this.program, 'u_planeSizes')!,
      boxCount: gl.getUniformLocation(this.program, 'u_boxCount')!,
      boxCenters: gl.getUniformLocation(this.program, 'u_boxCenters')!,
      boxSizes: gl.getUniformLocation(this.program, 'u_boxSizes')!,
      boxColors: gl.getUniformLocation(this.program, 'u_boxColors')!,
      boxRadii: gl.getUniformLocation(this.program, 'u_boxRadii')!,
      boxRotations,
      boxRotationsInv,
      ambientColor: gl.getUniformLocation(this.program, 'u_ambientColor')!,
      ambientIntensity: gl.getUniformLocation(this.program, 'u_ambientIntensity')!,
      lightCount: gl.getUniformLocation(this.program, 'u_lightCount')!,
      lightDirs: gl.getUniformLocation(this.program, 'u_lightDirs')!,
      lightColors: gl.getUniformLocation(this.program, 'u_lightColors')!,
      lightIntensities: gl.getUniformLocation(this.program, 'u_lightIntensities')!,
      backgroundColor: gl.getUniformLocation(this.program, 'u_backgroundColor')!,
      shadowBlur: gl.getUniformLocation(this.program, 'u_shadowBlur')!,
    }
  }

  private setupVertexAttributes(): void {
    const gl = this.gl
    const positionLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
  }

  private normalize(v: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (len === 0) return { x: 0, y: 0, z: 0 }
    return { x: v.x / len, y: v.y / len, z: v.z / len }
  }

  private cross(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    }
  }

  private sub(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }) {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
  }

  // Create rotation matrix from Euler angles (XYZ order)
  // Returns column-major mat3 as Float32Array for WebGL
  private eulerToMatrix(euler: { x: number; y: number; z: number }): Float32Array {
    const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
    const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
    const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

    // Rotation matrix R = Rz * Ry * Rx (applied in order X, Y, Z)
    // Column-major order for WebGL
    return new Float32Array([
      cy * cz,                      cy * sz,                      -sy,
      sx * sy * cz - cx * sz,       sx * sy * sz + cx * cz,       sx * cy,
      cx * sy * cz + sx * sz,       cx * sy * sz - sx * cz,       cx * cy,
    ])
  }

  // Create inverse rotation matrix (transpose of rotation matrix)
  private eulerToMatrixInverse(euler: { x: number; y: number; z: number }): Float32Array {
    const cx = Math.cos(euler.x), sx = Math.sin(euler.x)
    const cy = Math.cos(euler.y), sy = Math.sin(euler.y)
    const cz = Math.cos(euler.z), sz = Math.sin(euler.z)

    // Transpose of rotation matrix (column-major)
    return new Float32Array([
      cy * cz,                      sx * sy * cz - cx * sz,       cx * sy * cz + sx * sz,
      cy * sz,                      sx * sy * sz + cx * cz,       cx * sy * sz - sx * cz,
      -sy,                          sx * cy,                      cx * cy,
    ])
  }

  render(scene: Scene, camera: OrthographicCamera): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    const {
      objects,
      lights,
      backgroundColor = { r: 20 / 255, g: 20 / 255, b: 40 / 255 },
      shadowShader,
      shadowBlur = 0,
    } = scene

    // Recompile shader if shadowShader changed
    this.recompileIfNeeded(shadowShader)

    // Separate objects by type
    const planes = objects.filter((o): o is ScenePlane => o.type === 'plane')
    const boxes = objects.filter((o): o is SceneBox => o.type === 'box')

    // Separate lights by type
    const ambientLight = lights.find((l): l is AmbientLight => l.type === 'ambient')
      ?? { type: 'ambient' as const, color: { r: 1, g: 1, b: 1 }, intensity: 1 }
    const directionalLights = lights.filter((l): l is DirectionalLight => l.type === 'directional')

    gl.viewport(0, 0, canvas.width, canvas.height)

    // Calculate camera basis vectors
    const forward = this.normalize(this.sub(camera.lookAt, camera.position))
    const right = this.normalize(this.cross(camera.up, forward))
    const up = this.cross(forward, right)

    // Set camera uniforms
    gl.uniform3f(this.uniforms.cameraPosition, camera.position.x, camera.position.y, camera.position.z)
    gl.uniform3f(this.uniforms.cameraForward, forward.x, forward.y, forward.z)
    gl.uniform3f(this.uniforms.cameraRight, right.x, right.y, right.z)
    gl.uniform3f(this.uniforms.cameraUp, up.x, up.y, up.z)
    gl.uniform1f(this.uniforms.cameraWidth, camera.width)
    gl.uniform1f(this.uniforms.cameraHeight, camera.height)

    // Set plane uniforms
    const maxPlanes = 32
    const planeCount = Math.min(planes.length, maxPlanes)
    gl.uniform1i(this.uniforms.planeCount, planeCount)

    const planePoints = new Float32Array(maxPlanes * 3)
    const planeNormals = new Float32Array(maxPlanes * 3)
    const planeColors = new Float32Array(maxPlanes * 3)
    const planeSizes = new Float32Array(maxPlanes * 2)

    for (let i = 0; i < planeCount; i++) {
      const plane = planes[i]!
      planePoints[i * 3] = plane.geometry.point.x
      planePoints[i * 3 + 1] = plane.geometry.point.y
      planePoints[i * 3 + 2] = plane.geometry.point.z

      planeNormals[i * 3] = plane.geometry.normal.x
      planeNormals[i * 3 + 1] = plane.geometry.normal.y
      planeNormals[i * 3 + 2] = plane.geometry.normal.z

      planeColors[i * 3] = plane.color.r
      planeColors[i * 3 + 1] = plane.color.g
      planeColors[i * 3 + 2] = plane.color.b

      planeSizes[i * 2] = plane.geometry.width ?? -1
      planeSizes[i * 2 + 1] = plane.geometry.height ?? -1
    }

    gl.uniform3fv(this.uniforms.planePoints, planePoints)
    gl.uniform3fv(this.uniforms.planeNormals, planeNormals)
    gl.uniform3fv(this.uniforms.planeColors, planeColors)
    gl.uniform2fv(this.uniforms.planeSizes, planeSizes)

    // Set box uniforms
    const maxBoxes = 64
    const boxCount = Math.min(boxes.length, maxBoxes)
    gl.uniform1i(this.uniforms.boxCount, boxCount)

    const boxCenters = new Float32Array(maxBoxes * 3)
    const boxSizes = new Float32Array(maxBoxes * 3)
    const boxColors = new Float32Array(maxBoxes * 3)
    const boxRadii = new Float32Array(maxBoxes)
    const identityEuler = { x: 0, y: 0, z: 0 }

    for (let i = 0; i < maxBoxes; i++) {
      if (i < boxCount) {
        const box = boxes[i]!
        boxCenters[i * 3] = box.geometry.center.x
        boxCenters[i * 3 + 1] = box.geometry.center.y
        boxCenters[i * 3 + 2] = box.geometry.center.z

        boxSizes[i * 3] = box.geometry.size.x
        boxSizes[i * 3 + 1] = box.geometry.size.y
        boxSizes[i * 3 + 2] = box.geometry.size.z

        boxColors[i * 3] = box.color.r
        boxColors[i * 3 + 1] = box.color.g
        boxColors[i * 3 + 2] = box.color.b

        boxRadii[i] = box.geometry.radius ?? 0

        const euler = box.geometry.rotation ?? identityEuler
        gl.uniformMatrix3fv(this.uniforms.boxRotations[i]!, false, this.eulerToMatrix(euler))
        gl.uniformMatrix3fv(this.uniforms.boxRotationsInv[i]!, false, this.eulerToMatrixInverse(euler))
      } else {
        // Set identity matrix for unused boxes
        gl.uniformMatrix3fv(this.uniforms.boxRotations[i]!, false, this.eulerToMatrix(identityEuler))
        gl.uniformMatrix3fv(this.uniforms.boxRotationsInv[i]!, false, this.eulerToMatrixInverse(identityEuler))
      }
    }

    gl.uniform3fv(this.uniforms.boxCenters, boxCenters)
    gl.uniform3fv(this.uniforms.boxSizes, boxSizes)
    gl.uniform3fv(this.uniforms.boxColors, boxColors)
    gl.uniform1fv(this.uniforms.boxRadii, boxRadii)

    // Set ambient light uniforms
    gl.uniform3f(
      this.uniforms.ambientColor,
      ambientLight.color.r,
      ambientLight.color.g,
      ambientLight.color.b
    )
    gl.uniform1f(this.uniforms.ambientIntensity, ambientLight.intensity)

    // Set directional light uniforms
    const maxLights = 4
    const lightCount = Math.min(directionalLights.length, maxLights)
    gl.uniform1i(this.uniforms.lightCount, lightCount)

    const lightDirs = new Float32Array(maxLights * 3)
    const lightColors = new Float32Array(maxLights * 3)
    const lightIntensities = new Float32Array(maxLights)

    for (let i = 0; i < lightCount; i++) {
      const light = directionalLights[i]!
      // Normalize and negate direction (shader expects direction TO the light)
      const dir = this.normalize(light.direction)
      lightDirs[i * 3] = -dir.x
      lightDirs[i * 3 + 1] = -dir.y
      lightDirs[i * 3 + 2] = -dir.z

      lightColors[i * 3] = light.color.r
      lightColors[i * 3 + 1] = light.color.g
      lightColors[i * 3 + 2] = light.color.b

      lightIntensities[i] = light.intensity
    }

    gl.uniform3fv(this.uniforms.lightDirs, lightDirs)
    gl.uniform3fv(this.uniforms.lightColors, lightColors)
    gl.uniform1fv(this.uniforms.lightIntensities, lightIntensities)

    gl.uniform3f(
      this.uniforms.backgroundColor,
      backgroundColor.r,
      backgroundColor.g,
      backgroundColor.b
    )

    // Set shadow blur
    gl.uniform1f(this.uniforms.shadowBlur, shadowBlur)

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteBuffer(this.positionBuffer)
    gl.deleteProgram(this.program)
  }
}
