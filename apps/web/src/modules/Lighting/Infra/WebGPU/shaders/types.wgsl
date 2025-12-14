// =============================================================================
// Structs and Bindings
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

// Hit information structure for ray tracing
struct HitInfo {
  t: f32,
  color: vec3f,
  normal: vec3f,
  alpha: f32,
  ior: f32,
}

// Vertex output structure
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
}

// =============================================================================
// Bindings
// =============================================================================

// 2D Grid for spatial partitioning (32 bytes)
struct Grid2D {
  minX: f32,            // 0-3
  minY: f32,            // 4-7
  minZ: f32,            // 8-11
  _pad0: f32,           // 12-15
  cellSize: f32,        // 16-19
  cellsX: u32,          // 20-23
  cellsY: u32,          // 24-27
  useGrid: u32,         // 28-31 (0 = disabled, 1 = enabled)
}

// Cell data (8 bytes per cell)
struct CellData {
  startIndex: u32,      // Start index in object indices array
  count: u32,           // Number of objects in this cell
}

@group(0) @binding(0) var<uniform> scene: SceneUniforms;
@group(0) @binding(1) var<storage, read> planes: array<Plane>;
@group(0) @binding(2) var<storage, read> boxes: array<Box>;
@group(0) @binding(3) var<storage, read> lights: array<DirLight>;
@group(0) @binding(4) var<storage, read> capsules: array<Capsule>;
@group(0) @binding(5) var<storage, read> spheres: array<Sphere>;
@group(0) @binding(6) var<uniform> grid: Grid2D;
@group(0) @binding(7) var<storage, read> gridCells: array<CellData>;
@group(0) @binding(8) var<storage, read> gridIndices: array<u32>;
