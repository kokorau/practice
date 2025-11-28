/**
 * WebGL Ray Tracing Renderer
 * GPU でレイトレーシングを行う
 */

import type { OrthographicCamera, PlaneGeometry, BoxGeometry, AmbientLight, DirectionalLight } from '../../Domain/ValueObject'

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

// Fragment Shader - レイトレーシング
const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 v_uv;

  // Camera uniforms
  uniform vec3 u_cameraPosition;
  uniform vec3 u_cameraForward;
  uniform vec3 u_cameraRight;
  uniform vec3 u_cameraUp;
  uniform float u_cameraWidth;
  uniform float u_cameraHeight;

  // Plane uniforms (max 8 planes)
  const int MAX_PLANES = 8;
  uniform int u_planeCount;
  uniform vec3 u_planePoints[MAX_PLANES];
  uniform vec3 u_planeNormals[MAX_PLANES];
  uniform vec3 u_planeColors[MAX_PLANES];
  uniform vec2 u_planeSizes[MAX_PLANES]; // width, height (-1 = infinite)

  // Box uniforms (max 8 boxes)
  const int MAX_BOXES = 8;
  uniform int u_boxCount;
  uniform vec3 u_boxCenters[MAX_BOXES];
  uniform vec3 u_boxSizes[MAX_BOXES];
  uniform vec3 u_boxColors[MAX_BOXES];
  uniform mat3 u_boxRotations[MAX_BOXES]; // Rotation matrices (world -> local)
  uniform mat3 u_boxRotationsInv[MAX_BOXES]; // Inverse rotation matrices (local -> world)

  // Ambient light
  uniform vec3 u_ambientColor;
  uniform float u_ambientIntensity;

  // Directional light
  uniform vec3 u_directionalDir; // Direction TO the light (normalized)
  uniform vec3 u_directionalColor;
  uniform float u_directionalIntensity;

  // Background color
  uniform vec3 u_backgroundColor;

  // Build orthonormal basis from normal
  void buildBasis(vec3 normal, out vec3 right, out vec3 up) {
    vec3 tmp = abs(normal.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
    right = normalize(cross(tmp, normal));
    up = cross(normal, right);
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

  // Check if a point is in shadow
  bool isInShadow(vec3 hitPoint, vec3 lightDir) {
    // Offset slightly along normal to avoid self-intersection
    vec3 shadowOrigin = hitPoint + lightDir * 0.001;

    // Check planes
    for (int i = 0; i < MAX_PLANES; i++) {
      if (i >= u_planeCount) break;
      float t = intersectPlane(shadowOrigin, lightDir, u_planePoints[i], u_planeNormals[i], u_planeSizes[i]);
      if (t > 0.0) return true;
    }

    // Check boxes
    for (int i = 0; i < MAX_BOXES; i++) {
      if (i >= u_boxCount) break;
      float t = intersectBoxSimple(shadowOrigin, lightDir, u_boxCenters[i], u_boxSizes[i], u_boxRotations[i]);
      if (t > 0.0) return true;
    }

    return false;
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

    // Check boxes
    for (int i = 0; i < MAX_BOXES; i++) {
      if (i >= u_boxCount) break;

      vec3 boxNormal;
      float t = intersectBox(
        rayOrigin,
        rayDir,
        u_boxCenters[i],
        u_boxSizes[i],
        u_boxRotations[i],
        u_boxRotationsInv[i],
        boxNormal
      );

      if (t > 0.0 && t < closestT) {
        closestT = t;
        hitSurfaceColor = u_boxColors[i];
        hitNormal = boxNormal;
        hasHit = true;
      }
    }

    if (hasHit) {
      vec3 hitPoint = rayOrigin + closestT * rayDir;

      // Ambient lighting (always applied)
      vec3 ambient = hitSurfaceColor * u_ambientColor * u_ambientIntensity;

      // Directional lighting with shadow
      vec3 diffuse = vec3(0.0);
      float NdotL = max(0.0, dot(hitNormal, u_directionalDir));

      if (NdotL > 0.0 && !isInShadow(hitPoint, u_directionalDir)) {
        diffuse = hitSurfaceColor * u_directionalColor * u_directionalIntensity * NdotL;
      }

      hitColor = ambient + diffuse;
    }

    gl_FragColor = vec4(hitColor, 1.0);
  }
`

export interface ScenePlane {
  geometry: PlaneGeometry
  color: readonly [number, number, number] // RGB 0-255
}

export interface SceneBox {
  geometry: BoxGeometry
  color: readonly [number, number, number] // RGB 0-255
}

export interface RenderOptions {
  camera: OrthographicCamera
  planes?: ScenePlane[]
  boxes?: SceneBox[]
  ambientLight?: AmbientLight
  directionalLight?: DirectionalLight
  backgroundColor?: readonly [number, number, number]
}

export class RayTracingRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private positionBuffer: WebGLBuffer

  private uniforms: {
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
    boxRotations: WebGLUniformLocation[]
    boxRotationsInv: WebGLUniformLocation[]
    ambientColor: WebGLUniformLocation
    ambientIntensity: WebGLUniformLocation
    directionalDir: WebGLUniformLocation
    directionalColor: WebGLUniformLocation
    directionalIntensity: WebGLUniformLocation
    backgroundColor: WebGLUniformLocation
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

  private createProgram(): WebGLProgram {
    const gl = this.gl
    const vertexShader = this.createShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)

    const program = gl.createProgram()!
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program)
      throw new Error(`Program link error: ${error}`)
    }

    gl.useProgram(program)
    return program
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
    const maxBoxes = 8

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
      boxRotations,
      boxRotationsInv,
      ambientColor: gl.getUniformLocation(this.program, 'u_ambientColor')!,
      ambientIntensity: gl.getUniformLocation(this.program, 'u_ambientIntensity')!,
      directionalDir: gl.getUniformLocation(this.program, 'u_directionalDir')!,
      directionalColor: gl.getUniformLocation(this.program, 'u_directionalColor')!,
      directionalIntensity: gl.getUniformLocation(this.program, 'u_directionalIntensity')!,
      backgroundColor: gl.getUniformLocation(this.program, 'u_backgroundColor')!,
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

  render(options: RenderOptions): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    const {
      camera,
      planes = [],
      boxes = [],
      ambientLight = { type: 'ambient', color: [1, 1, 1], intensity: 1 },
      directionalLight,
      backgroundColor = [20, 20, 40],
    } = options

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
    const maxPlanes = 8
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

      planeColors[i * 3] = plane.color[0] / 255
      planeColors[i * 3 + 1] = plane.color[1] / 255
      planeColors[i * 3 + 2] = plane.color[2] / 255

      planeSizes[i * 2] = plane.geometry.width ?? -1
      planeSizes[i * 2 + 1] = plane.geometry.height ?? -1
    }

    gl.uniform3fv(this.uniforms.planePoints, planePoints)
    gl.uniform3fv(this.uniforms.planeNormals, planeNormals)
    gl.uniform3fv(this.uniforms.planeColors, planeColors)
    gl.uniform2fv(this.uniforms.planeSizes, planeSizes)

    // Set box uniforms
    const maxBoxes = 8
    const boxCount = Math.min(boxes.length, maxBoxes)
    gl.uniform1i(this.uniforms.boxCount, boxCount)

    const boxCenters = new Float32Array(maxBoxes * 3)
    const boxSizes = new Float32Array(maxBoxes * 3)
    const boxColors = new Float32Array(maxBoxes * 3)
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

        boxColors[i * 3] = box.color[0] / 255
        boxColors[i * 3 + 1] = box.color[1] / 255
        boxColors[i * 3 + 2] = box.color[2] / 255

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

    // Set ambient light uniforms
    gl.uniform3f(
      this.uniforms.ambientColor,
      ambientLight.color[0],
      ambientLight.color[1],
      ambientLight.color[2]
    )
    gl.uniform1f(this.uniforms.ambientIntensity, ambientLight.intensity)

    // Set directional light uniforms
    if (directionalLight) {
      // Normalize and negate direction (shader expects direction TO the light)
      const dir = this.normalize(directionalLight.direction)
      gl.uniform3f(this.uniforms.directionalDir, -dir.x, -dir.y, -dir.z)
      gl.uniform3f(
        this.uniforms.directionalColor,
        directionalLight.color[0],
        directionalLight.color[1],
        directionalLight.color[2]
      )
      gl.uniform1f(this.uniforms.directionalIntensity, directionalLight.intensity)
    } else {
      // No directional light
      gl.uniform3f(this.uniforms.directionalDir, 0, 0, 0)
      gl.uniform3f(this.uniforms.directionalColor, 0, 0, 0)
      gl.uniform1f(this.uniforms.directionalIntensity, 0)
    }

    gl.uniform3f(
      this.uniforms.backgroundColor,
      backgroundColor[0] / 255,
      backgroundColor[1] / 255,
      backgroundColor[2] / 255
    )

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  dispose(): void {
    const gl = this.gl
    gl.deleteBuffer(this.positionBuffer)
    gl.deleteProgram(this.program)
  }
}
