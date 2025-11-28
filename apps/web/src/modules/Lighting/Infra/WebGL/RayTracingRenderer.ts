/**
 * WebGL Ray Tracing Renderer
 * GPU でレイトレーシングを行う
 */

import type { OrthographicCamera, PlaneGeometry, AmbientLight } from '../../Domain/ValueObject'

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

  // Ambient light
  uniform vec3 u_ambientColor;
  uniform float u_ambientIntensity;

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
    bool hasHit = false;

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
        hasHit = true;
      }
    }

    if (hasHit) {
      // Apply ambient lighting: surfaceColor * ambientColor * intensity
      vec3 ambient = hitSurfaceColor * u_ambientColor * u_ambientIntensity;
      hitColor = ambient;
    }

    gl_FragColor = vec4(hitColor, 1.0);
  }
`

export interface ScenePlane {
  geometry: PlaneGeometry
  color: readonly [number, number, number] // RGB 0-255
}

export interface RenderOptions {
  camera: OrthographicCamera
  planes: ScenePlane[]
  ambientLight?: AmbientLight
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
    ambientColor: WebGLUniformLocation
    ambientIntensity: WebGLUniformLocation
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
      ambientColor: gl.getUniformLocation(this.program, 'u_ambientColor')!,
      ambientIntensity: gl.getUniformLocation(this.program, 'u_ambientIntensity')!,
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

  render(options: RenderOptions): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement
    const {
      camera,
      planes,
      ambientLight = { type: 'ambient', color: [1, 1, 1], intensity: 1 },
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

    const points = new Float32Array(maxPlanes * 3)
    const normals = new Float32Array(maxPlanes * 3)
    const colors = new Float32Array(maxPlanes * 3)
    const sizes = new Float32Array(maxPlanes * 2)

    for (let i = 0; i < planeCount; i++) {
      const plane = planes[i]!
      points[i * 3] = plane.geometry.point.x
      points[i * 3 + 1] = plane.geometry.point.y
      points[i * 3 + 2] = plane.geometry.point.z

      normals[i * 3] = plane.geometry.normal.x
      normals[i * 3 + 1] = plane.geometry.normal.y
      normals[i * 3 + 2] = plane.geometry.normal.z

      colors[i * 3] = plane.color[0] / 255
      colors[i * 3 + 1] = plane.color[1] / 255
      colors[i * 3 + 2] = plane.color[2] / 255

      sizes[i * 2] = plane.geometry.width ?? -1
      sizes[i * 2 + 1] = plane.geometry.height ?? -1
    }

    gl.uniform3fv(this.uniforms.planePoints, points)
    gl.uniform3fv(this.uniforms.planeNormals, normals)
    gl.uniform3fv(this.uniforms.planeColors, colors)
    gl.uniform2fv(this.uniforms.planeSizes, sizes)

    // Set ambient light uniforms
    gl.uniform3f(
      this.uniforms.ambientColor,
      ambientLight.color[0],
      ambientLight.color[1],
      ambientLight.color[2]
    )
    gl.uniform1f(this.uniforms.ambientIntensity, ambientLight.intensity)

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
