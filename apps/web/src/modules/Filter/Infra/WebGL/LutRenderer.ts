/**
 * WebGL LUT Renderer
 * GPU で LUT 適用 + エフェクト処理を行う
 */

import type { Lut } from '../../Domain/ValueObject/Lut'

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

// Fragment Shader - LUT適用 + Vibrance + Hue Rotation + Selective Color
const FRAGMENT_SHADER = `
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

export type LutRendererOptions = {
  canvas: HTMLCanvasElement
}

export type RenderOptions = {
  lut: Lut
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
  private lutTextures: { r: WebGLTexture; g: WebGLTexture; b: WebGLTexture }
  private positionBuffer: WebGLBuffer
  private texCoordBuffer: WebGLBuffer

  // Uniform locations
  private uniforms: {
    image: WebGLUniformLocation
    lutR: WebGLUniformLocation
    lutG: WebGLUniformLocation
    lutB: WebGLUniformLocation
    vibrance: WebGLUniformLocation
    hueRotation: WebGLUniformLocation
    selectiveColorEnabled: WebGLUniformLocation
    selectiveHue: WebGLUniformLocation
    selectiveRange: WebGLUniformLocation
    selectiveDesaturate: WebGLUniformLocation
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
    this.program = this.createProgram()
    this.imageTexture = this.createTexture()
    this.lutTextures = {
      r: this.createLutTexture(),
      g: this.createLutTexture(),
      b: this.createLutTexture(),
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
    // LUT は NEAREST で補間なし（正確なルックアップ）
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
    return {
      image: gl.getUniformLocation(this.program, 'u_image')!,
      lutR: gl.getUniformLocation(this.program, 'u_lutR')!,
      lutG: gl.getUniformLocation(this.program, 'u_lutG')!,
      lutB: gl.getUniformLocation(this.program, 'u_lutB')!,
      vibrance: gl.getUniformLocation(this.program, 'u_vibrance')!,
      hueRotation: gl.getUniformLocation(this.program, 'u_hueRotation')!,
      selectiveColorEnabled: gl.getUniformLocation(this.program, 'u_selectiveColorEnabled')!,
      selectiveHue: gl.getUniformLocation(this.program, 'u_selectiveHue')!,
      selectiveRange: gl.getUniformLocation(this.program, 'u_selectiveRange')!,
      selectiveDesaturate: gl.getUniformLocation(this.program, 'u_selectiveDesaturate')!,
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

  /** LUT テクスチャを更新 */
  updateLut(lut: Lut): void {
    const gl = this.gl

    // R channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.r)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.r)

    // G channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.g)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.g)

    // B channel
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.b)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lut.b)
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
    if (source instanceof ImageData) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    }

    // Update LUT textures
    this.updateLut(options.lut)

    // Bind textures to units
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture)
    gl.uniform1i(this.uniforms.image, 0)

    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.r)
    gl.uniform1i(this.uniforms.lutR, 1)

    gl.activeTexture(gl.TEXTURE2)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.g)
    gl.uniform1i(this.uniforms.lutG, 2)

    gl.activeTexture(gl.TEXTURE3)
    gl.bindTexture(gl.TEXTURE_2D, this.lutTextures.b)
    gl.uniform1i(this.uniforms.lutB, 3)

    // Set uniforms
    gl.uniform1f(this.uniforms.vibrance, options.vibrance ?? 0)
    gl.uniform1f(this.uniforms.hueRotation, ((options.hueRotation ?? 0) * Math.PI) / 180)

    // Selective Color uniforms
    gl.uniform1i(this.uniforms.selectiveColorEnabled, options.selectiveColorEnabled ? 1 : 0)
    gl.uniform1f(this.uniforms.selectiveHue, (options.selectiveHue ?? 0) / 360) // normalize to 0-1
    gl.uniform1f(this.uniforms.selectiveRange, (options.selectiveRange ?? 0) / 360) // normalize to 0-1
    gl.uniform1f(this.uniforms.selectiveDesaturate, options.selectiveDesaturate ?? 0)

    // Draw
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** リソース解放 */
  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.imageTexture)
    gl.deleteTexture(this.lutTextures.r)
    gl.deleteTexture(this.lutTextures.g)
    gl.deleteTexture(this.lutTextures.b)
    gl.deleteBuffer(this.positionBuffer)
    gl.deleteBuffer(this.texCoordBuffer)
    gl.deleteProgram(this.program)
  }
}
