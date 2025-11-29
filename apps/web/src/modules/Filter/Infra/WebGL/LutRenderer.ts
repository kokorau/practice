/**
 * WebGL LUT Renderer
 * GPU で LUT 適用 + エフェクト処理を行う
 * 1D LUT と 3D LUT の両方をサポート
 */

import type { Lut, Lut1D, Lut3D } from '../../Domain/ValueObject/Lut'
import { $Lut3D, isLut3D } from '../../Domain/ValueObject/Lut'

// Vertex Shader - 単純な矩形描画
const VERTEX_SHADER = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`

// Fragment Shader - 1D LUT適用 + Vibrance + Hue Rotation + Selective Color
const FRAGMENT_SHADER_1D = `
  precision mediump float;

  varying vec2 v_texCoord;

  uniform sampler2D u_image;
  uniform sampler2D u_lutR;
  uniform sampler2D u_lutG;
  uniform sampler2D u_lutB;

  // Effects
  uniform float u_vibrance;
  uniform float u_hueRotation; // in radians

  // Selective Color
  uniform bool u_selectiveColorEnabled;
  uniform float u_selectiveHue; // normalized 0-1
  uniform float u_selectiveRange; // normalized 0-1
  uniform float u_selectiveDesaturate; // 0-1

  // RGB <-> HSL conversion
  vec3 rgbToHsl(vec3 rgb) {
    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float l = (maxC + minC) / 2.0;

    if (maxC == minC) {
      return vec3(0.0, 0.0, l);
    }

    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    float h;
    if (maxC == rgb.r) {
      h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
    } else if (maxC == rgb.g) {
      h = (rgb.b - rgb.r) / d + 2.0;
    } else {
      h = (rgb.r - rgb.g) / d + 4.0;
    }
    h /= 6.0;

    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hslToRgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    if (s == 0.0) {
      return vec3(l, l, l);
    }

    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;

    return vec3(
      hue2rgb(p, q, h + 1.0/3.0),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1.0/3.0)
    );
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // 1. Apply LUT (1D texture lookup)
    float r = texture2D(u_lutR, vec2(color.r, 0.5)).r;
    float g = texture2D(u_lutG, vec2(color.g, 0.5)).r;
    float b = texture2D(u_lutB, vec2(color.b, 0.5)).r;
    vec3 rgb = vec3(r, g, b);

    // 2. Hue Rotation
    if (abs(u_hueRotation) > 0.001) {
      vec3 hsl = rgbToHsl(rgb);
      hsl.x = fract(hsl.x + u_hueRotation / 6.28318530718); // normalize to 0-1
      rgb = hslToRgb(hsl);
    }

    // 3. Selective Color (desaturate all except target hue)
    if (u_selectiveColorEnabled) {
      vec3 hsl = rgbToHsl(rgb);
      float h = hsl.x;

      // Calculate hue distance (circular)
      float hueDist = abs(h - u_selectiveHue);
      if (hueDist > 0.5) hueDist = 1.0 - hueDist;

      // Check if within range
      if (hueDist > u_selectiveRange) {
        // Outside target range - desaturate
        hsl.y *= (1.0 - u_selectiveDesaturate);
        rgb = hslToRgb(hsl);
      }
    }

    // 4. Vibrance
    if (abs(u_vibrance) > 0.001) {
      float maxC = max(max(rgb.r, rgb.g), rgb.b);
      float minC = min(min(rgb.r, rgb.g), rgb.b);
      float sat = maxC - minC;
      float avg = (rgb.r + rgb.g + rgb.b) / 3.0;

      // Low saturation pixels get more boost
      float boost = u_vibrance * (1.0 - sat);
      rgb = mix(vec3(avg), rgb, 1.0 + boost);
    }

    gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
  }
`

// Fragment Shader - 3D LUT適用 + Vibrance + Hue Rotation + Selective Color
// 3D LUT は 2D テクスチャにパックされている (size x size*size)
const FRAGMENT_SHADER_3D = `
  precision mediump float;

  varying vec2 v_texCoord;

  uniform sampler2D u_image;
  uniform sampler2D u_lut3d;  // 3D LUT packed into 2D texture
  uniform float u_lutSize;    // LUT grid size (e.g., 17, 33)

  // Effects
  uniform float u_vibrance;
  uniform float u_hueRotation; // in radians

  // Selective Color
  uniform bool u_selectiveColorEnabled;
  uniform float u_selectiveHue; // normalized 0-1
  uniform float u_selectiveRange; // normalized 0-1
  uniform float u_selectiveDesaturate; // 0-1

  // RGB <-> HSL conversion
  vec3 rgbToHsl(vec3 rgb) {
    float maxC = max(max(rgb.r, rgb.g), rgb.b);
    float minC = min(min(rgb.r, rgb.g), rgb.b);
    float l = (maxC + minC) / 2.0;

    if (maxC == minC) {
      return vec3(0.0, 0.0, l);
    }

    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    float h;
    if (maxC == rgb.r) {
      h = (rgb.g - rgb.b) / d + (rgb.g < rgb.b ? 6.0 : 0.0);
    } else if (maxC == rgb.g) {
      h = (rgb.b - rgb.r) / d + 2.0;
    } else {
      h = (rgb.r - rgb.g) / d + 4.0;
    }
    h /= 6.0;

    return vec3(h, s, l);
  }

  float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
    if (t < 1.0/2.0) return q;
    if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
    return p;
  }

  vec3 hslToRgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    if (s == 0.0) {
      return vec3(l, l, l);
    }

    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;

    return vec3(
      hue2rgb(p, q, h + 1.0/3.0),
      hue2rgb(p, q, h),
      hue2rgb(p, q, h - 1.0/3.0)
    );
  }

  // Sample LUT at integer indices
  // row = g + b * size, column = r
  // UV: x = (r + 0.5) / size, y = (g + b * size + 0.5) / (size * size)
  vec3 sampleLut(float r, float g, float b) {
    float row = g + b * u_lutSize;
    vec2 uv = vec2(
      (r + 0.5) / u_lutSize,
      (row + 0.5) / (u_lutSize * u_lutSize)
    );
    return texture2D(u_lut3d, uv).rgb;
  }

  // 3D LUT lookup with trilinear interpolation
  // LUT is packed as size x (size * size) 2D texture
  // Layout: row = g + b * size, column = r
  vec3 lookup3D(vec3 color) {
    float maxIdx = u_lutSize - 1.0;

    // Scale to LUT indices
    vec3 scaled = color * maxIdx;

    // Get integer indices
    vec3 idx0 = floor(scaled);
    vec3 idx1 = min(idx0 + 1.0, vec3(maxIdx));

    // Interpolation weights
    vec3 t = scaled - idx0;

    // Sample 8 corners
    vec3 c000 = sampleLut(idx0.r, idx0.g, idx0.b);
    vec3 c100 = sampleLut(idx1.r, idx0.g, idx0.b);
    vec3 c010 = sampleLut(idx0.r, idx1.g, idx0.b);
    vec3 c110 = sampleLut(idx1.r, idx1.g, idx0.b);
    vec3 c001 = sampleLut(idx0.r, idx0.g, idx1.b);
    vec3 c101 = sampleLut(idx1.r, idx0.g, idx1.b);
    vec3 c011 = sampleLut(idx0.r, idx1.g, idx1.b);
    vec3 c111 = sampleLut(idx1.r, idx1.g, idx1.b);

    // Trilinear interpolation
    vec3 c00 = mix(c000, c100, t.r);
    vec3 c01 = mix(c001, c101, t.r);
    vec3 c10 = mix(c010, c110, t.r);
    vec3 c11 = mix(c011, c111, t.r);

    vec3 c0 = mix(c00, c10, t.g);
    vec3 c1 = mix(c01, c11, t.g);

    return mix(c0, c1, t.b);
  }

  void main() {
    vec4 color = texture2D(u_image, v_texCoord);

    // 1. Apply 3D LUT with trilinear interpolation
    vec3 rgb = lookup3D(color.rgb);

    // 2. Hue Rotation
    if (abs(u_hueRotation) > 0.001) {
      vec3 hsl = rgbToHsl(rgb);
      hsl.x = fract(hsl.x + u_hueRotation / 6.28318530718);
      rgb = hslToRgb(hsl);
    }

    // 3. Selective Color
    if (u_selectiveColorEnabled) {
      vec3 hsl = rgbToHsl(rgb);
      float h = hsl.x;
      float hueDist = abs(h - u_selectiveHue);
      if (hueDist > 0.5) hueDist = 1.0 - hueDist;
      if (hueDist > u_selectiveRange) {
        hsl.y *= (1.0 - u_selectiveDesaturate);
        rgb = hslToRgb(hsl);
      }
    }

    // 4. Vibrance
    if (abs(u_vibrance) > 0.001) {
      float maxC = max(max(rgb.r, rgb.g), rgb.b);
      float minC = min(min(rgb.r, rgb.g), rgb.b);
      float sat = maxC - minC;
      float avg = (rgb.r + rgb.g + rgb.b) / 3.0;
      float boost = u_vibrance * (1.0 - sat);
      rgb = mix(vec3(avg), rgb, 1.0 + boost);
    }

    gl_FragColor = vec4(clamp(rgb, 0.0, 1.0), color.a);
  }
`

export type LutRendererOptions = {
  canvas: HTMLCanvasElement
  /** 3D LUT モードを使用 (デフォルト: false = 1D LUT) */
  use3D?: boolean
}

export type RenderOptions = {
  /** LUT (1D or 3D - 自動判別) */
  lut?: Lut
  vibrance?: number
  hueRotation?: number // degrees
  // Selective Color
  selectiveColorEnabled?: boolean
  selectiveHue?: number // degrees 0-360
  selectiveRange?: number // degrees 0-180
  selectiveDesaturate?: number // 0-1
}

export class LutRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private imageTexture: WebGLTexture
  private positionBuffer: WebGLBuffer
  private texCoordBuffer: WebGLBuffer

  // Mode flag
  private use3D: boolean

  // 1D LUT textures (use3D = false)
  private lutTextures1D: { r: WebGLTexture; g: WebGLTexture; b: WebGLTexture } | null = null

  // 3D LUT texture (use3D = true)
  private lutTexture3D: WebGLTexture | null = null
  private currentLut3DSize: number = 0

  // Uniform locations (different for 1D vs 3D)
  private uniforms: {
    image: WebGLUniformLocation | null
    // 1D LUT uniforms
    lutR?: WebGLUniformLocation | null
    lutG?: WebGLUniformLocation | null
    lutB?: WebGLUniformLocation | null
    // 3D LUT uniforms
    lut3d?: WebGLUniformLocation | null
    lutSize?: WebGLUniformLocation | null
    // Common uniforms
    vibrance: WebGLUniformLocation | null
    hueRotation: WebGLUniformLocation | null
    selectiveColorEnabled: WebGLUniformLocation | null
    selectiveHue: WebGLUniformLocation | null
    selectiveRange: WebGLUniformLocation | null
    selectiveDesaturate: WebGLUniformLocation | null
  }

  constructor(options: LutRendererOptions) {
    const gl = options.canvas.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    })

    if (!gl) {
      throw new Error('WebGL not supported')
    }

    this.gl = gl
    this.use3D = options.use3D ?? false
    this.program = this.createProgram()
    this.imageTexture = this.createTexture()

    if (this.use3D) {
      this.lutTexture3D = this.createLutTexture()
    } else {
      this.lutTextures1D = {
        r: this.createLutTexture(),
        g: this.createLutTexture(),
        b: this.createLutTexture(),
      }
    }

    this.positionBuffer = this.createPositionBuffer()
    this.texCoordBuffer = this.createTexCoordBuffer()
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
    const fragmentSource = this.use3D ? FRAGMENT_SHADER_3D : FRAGMENT_SHADER_1D
    const fragmentShader = this.createShader(gl.FRAGMENT_SHADER, fragmentSource)

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

  private createTexture(): WebGLTexture {
    const gl = this.gl
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    return texture
  }

  private createLutTexture(): WebGLTexture {
    const gl = this.gl
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // LUT は NEAREST で補間なし（シェーダーで補間）
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return texture
  }

  private createPositionBuffer(): WebGLBuffer {
    const gl = this.gl
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // Full-screen quad (two triangles)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
      -1,  1,
       1, -1,
       1,  1,
    ]), gl.STATIC_DRAW)
    return buffer
  }

  private createTexCoordBuffer(): WebGLBuffer {
    const gl = this.gl
    const buffer = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    // Texture coordinates (flipped Y for video)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      0, 1,
      1, 1,
      0, 0,
      0, 0,
      1, 1,
      1, 0,
    ]), gl.STATIC_DRAW)
    return buffer
  }

  private getUniformLocations() {
    const gl = this.gl

    const common = {
      image: gl.getUniformLocation(this.program, 'u_image'),
      vibrance: gl.getUniformLocation(this.program, 'u_vibrance'),
      hueRotation: gl.getUniformLocation(this.program, 'u_hueRotation'),
      selectiveColorEnabled: gl.getUniformLocation(this.program, 'u_selectiveColorEnabled'),
      selectiveHue: gl.getUniformLocation(this.program, 'u_selectiveHue'),
      selectiveRange: gl.getUniformLocation(this.program, 'u_selectiveRange'),
      selectiveDesaturate: gl.getUniformLocation(this.program, 'u_selectiveDesaturate'),
    }

    if (this.use3D) {
      return {
        ...common,
        lut3d: gl.getUniformLocation(this.program, 'u_lut3d'),
        lutSize: gl.getUniformLocation(this.program, 'u_lutSize'),
      }
    } else {
      return {
        ...common,
        lutR: gl.getUniformLocation(this.program, 'u_lutR'),
        lutG: gl.getUniformLocation(this.program, 'u_lutG'),
        lutB: gl.getUniformLocation(this.program, 'u_lutB'),
      }
    }
  }

  private setupVertexAttributes(): void {
    const gl = this.gl

    const positionLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)

    const texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer)
    gl.enableVertexAttribArray(texCoordLoc)
    gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0)
  }

  /** 1D LUT テクスチャを更新 */
  updateLut1D(lut: Lut1D): void {
    if (this.use3D || !this.lutTextures1D) {
      throw new Error('Cannot use 1D LUT in 3D mode')
    }

    const gl = this.gl

    // R channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D.r)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.r)

    // G channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D.g)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.g)

    // B channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D.b)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.b)
  }

  /** 3D LUT テクスチャを更新 */
  updateLut3D(lut: Lut3D): void {
    if (!this.use3D || !this.lutTexture3D) {
      throw new Error('Cannot use 3D LUT in 1D mode')
    }

    const gl = this.gl
    const texData = $Lut3D.toTexture2D(lut)

    gl.bindTexture(gl.TEXTURE_2D, this.lutTexture3D)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      texData.width,
      texData.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      texData.data
    )

    this.currentLut3DSize = lut.size
  }

  /** 画像/ビデオをレンダリング */
  render(
    source: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement | ImageData,
    options: RenderOptions
  ): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement

    // Get source dimensions
    let width: number
    let height: number
    if (source instanceof HTMLVideoElement) {
      width = source.videoWidth
      height = source.videoHeight
    } else if (source instanceof ImageData) {
      width = source.width
      height = source.height
    } else {
      width = source.width
      height = source.height
    }

    // Update canvas size if needed
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
      gl.viewport(0, 0, width, height)
    }

    // Update image texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.uniform1i(this.uniforms.image, 0)

    // Bind LUT textures based on mode
    if (this.use3D) {
      // 3D mode: expect Lut3D or convert Lut to Lut3D
      if (options.lut) {
        if (isLut3D(options.lut)) {
          this.updateLut3D(options.lut)
        } else {
          // Convert 1D LUT to 3D LUT for compatibility
          this.updateLut3D($Lut3D.fromLut1D(options.lut))
        }
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTexture3D)
      gl.uniform1i(this.uniforms.lut3d!, 1)
      gl.uniform1f(this.uniforms.lutSize!, this.currentLut3DSize)
    } else {
      // 1D mode: expect Lut (1D)
      if (options.lut) {
        if (isLut3D(options.lut)) {
          throw new Error('Cannot use 3D LUT in 1D mode. Set use3D: true in LutRendererOptions.')
        }
        this.updateLut1D(options.lut)
      }
      gl.activeTexture(gl.TEXTURE1)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D!.r)
      gl.uniform1i(this.uniforms.lutR!, 1)

      gl.activeTexture(gl.TEXTURE2)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D!.g)
      gl.uniform1i(this.uniforms.lutG!, 2)

      gl.activeTexture(gl.TEXTURE3)
      gl.bindTexture(gl.TEXTURE_2D, this.lutTextures1D!.b)
      gl.uniform1i(this.uniforms.lutB!, 3)
    }

    // Set common uniforms
    gl.uniform1f(this.uniforms.vibrance!, options.vibrance ?? 0)
    gl.uniform1f(this.uniforms.hueRotation!, ((options.hueRotation ?? 0) * Math.PI) / 180)

    // Selective Color uniforms
    gl.uniform1i(this.uniforms.selectiveColorEnabled!, options.selectiveColorEnabled ? 1 : 0)
    gl.uniform1f(this.uniforms.selectiveHue!, (options.selectiveHue ?? 0) / 360)
    gl.uniform1f(this.uniforms.selectiveRange!, (options.selectiveRange ?? 0) / 360)
    gl.uniform1f(this.uniforms.selectiveDesaturate!, options.selectiveDesaturate ?? 0)

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** リソース解放 */
  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.imageTexture)

    if (this.lutTextures1D) {
      gl.deleteTexture(this.lutTextures1D.r)
      gl.deleteTexture(this.lutTextures1D.g)
      gl.deleteTexture(this.lutTextures1D.b)
    }

    if (this.lutTexture3D) {
      gl.deleteTexture(this.lutTexture3D)
    }

    gl.deleteBuffer(this.positionBuffer)
    gl.deleteBuffer(this.texCoordBuffer)
    gl.deleteProgram(this.program)
  }
}
