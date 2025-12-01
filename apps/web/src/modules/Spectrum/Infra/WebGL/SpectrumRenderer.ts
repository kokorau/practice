/**
 * WebGL Spectrum Renderer
 * 生のWebGL/GLSLでスペクトラムを可視化
 */

import type { Spectrum } from '../../Domain/ValueObject/Spectrum'
import {
  VISIBLE_MIN_WAVELENGTH,
  VISIBLE_MAX_WAVELENGTH,
} from '../../Domain/ValueObject/Spectrum'

// Vertex Shader
const VERTEX_SHADER = `
  attribute vec2 a_position;
  varying vec2 v_uv;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    // Convert from clip space (-1 to 1) to UV (0 to 1)
    v_uv = (a_position + 1.0) * 0.5;
  }
`

// Fragment Shader - スペクトラムの描画（棒グラフ）
const FRAGMENT_SHADER = `
  precision highp float;

  varying vec2 v_uv;

  uniform sampler2D u_spectrumData;  // 1D texture containing spectrum values
  uniform float u_sampleCount;
  uniform float u_minWavelength;
  uniform float u_maxWavelength;
  uniform float u_maxValue;  // スペクトラムの最大値（正規化用）

  // 波長（nm）からRGB色への変換
  // CIE 1931 XYZ色空間を経由
  vec3 wavelengthToRgb(float wavelength) {
    // Gaussian近似による色マッチング関数
    float x = 1.056 * exp(-0.5 * pow((wavelength - 599.8) / (wavelength < 599.8 ? 37.9 : 31.0), 2.0))
            + 0.362 * exp(-0.5 * pow((wavelength - 442.0) / (wavelength < 442.0 ? 16.0 : 26.7), 2.0))
            - 0.065 * exp(-0.5 * pow((wavelength - 501.1) / (wavelength < 501.1 ? 20.4 : 26.2), 2.0));

    float y = 0.821 * exp(-0.5 * pow((wavelength - 568.8) / (wavelength < 568.8 ? 46.9 : 40.5), 2.0))
            + 0.286 * exp(-0.5 * pow((wavelength - 530.9) / (wavelength < 530.9 ? 16.3 : 31.1), 2.0));

    float z = 1.217 * exp(-0.5 * pow((wavelength - 437.0) / (wavelength < 437.0 ? 11.8 : 36.0), 2.0))
            + 0.681 * exp(-0.5 * pow((wavelength - 459.0) / (wavelength < 459.0 ? 26.0 : 13.8), 2.0));

    // XYZ to linear sRGB (D65)
    float r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
    float g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
    float b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;

    // Gamma correction
    r = r <= 0.0031308 ? 12.92 * r : 1.055 * pow(r, 1.0/2.4) - 0.055;
    g = g <= 0.0031308 ? 12.92 * g : 1.055 * pow(g, 1.0/2.4) - 0.055;
    b = b <= 0.0031308 ? 12.92 * b : 1.055 * pow(b, 1.0/2.4) - 0.055;

    return clamp(vec3(r, g, b), 0.0, 1.0);
  }

  void main() {
    // 背景色（暗いグレー）
    vec3 bgColor = vec3(0.1, 0.1, 0.12);

    // 各サンプルの幅を計算
    float barWidth = 1.0 / u_sampleCount;

    // 現在のX座標がどのサンプルに属するかを計算
    float sampleIndex = floor(v_uv.x * u_sampleCount);
    float sampleCenter = (sampleIndex + 0.5) / u_sampleCount;

    // サンプル中央の波長
    float wavelength = mix(u_minWavelength, u_maxWavelength, sampleCenter);

    // 波長に対応する色
    vec3 spectrumColor = wavelengthToRgb(wavelength);

    // このサンプルのスペクトラム値を取得（NEAREST的に）
    float spectrumValue = texture2D(u_spectrumData, vec2(sampleCenter, 0.5)).r;

    // 正規化
    float normalizedValue = u_maxValue > 0.0 ? spectrumValue / u_maxValue : 0.0;

    // Y座標
    float y = v_uv.y;

    // グラフ領域（下から80%）
    float graphHeight = 0.8;
    float graphY = y / graphHeight;

    vec3 color = bgColor;

    if (y < graphHeight) {
      // 棒グラフ：Y座標が正規化された値以下なら色を表示
      if (graphY <= normalizedValue) {
        // 棒の色：波長に対応する色
        color = spectrumColor;
      } else {
        // グラフ上部：薄い波長色の背景
        color = mix(bgColor, spectrumColor, 0.08);
      }

      // グリッドライン（10%ごと）
      float gridStep = 0.1;
      float gridLine = mod(graphY, gridStep);
      if (gridLine < 0.002 || gridLine > gridStep - 0.002) {
        color = mix(color, vec3(0.3), 0.3);
      }
    } else {
      // 下部のカラーバー領域
      color = spectrumColor;
    }

    gl_FragColor = vec4(color, 1.0);
  }
`

export interface SpectrumRendererOptions {
  canvas: HTMLCanvasElement
}

export class SpectrumRenderer {
  private gl: WebGLRenderingContext
  private program: WebGLProgram
  private positionBuffer: WebGLBuffer
  private spectrumTexture: WebGLTexture
  private uniforms: {
    spectrumData: WebGLUniformLocation | null
    sampleCount: WebGLUniformLocation | null
    minWavelength: WebGLUniformLocation | null
    maxWavelength: WebGLUniformLocation | null
    maxValue: WebGLUniformLocation | null
  }

  constructor(options: SpectrumRendererOptions) {
    const gl = options.canvas.getContext('webgl', {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    })

    if (!gl) {
      throw new Error('WebGL not supported')
    }

    this.gl = gl
    this.program = this.createProgram()
    this.positionBuffer = this.createPositionBuffer()
    this.spectrumTexture = this.createSpectrumTexture()
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

  private createSpectrumTexture(): WebGLTexture {
    const gl = this.gl
    const texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    // 棒グラフなので補間なし（NEAREST）
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    return texture
  }

  private getUniformLocations() {
    const gl = this.gl
    return {
      spectrumData: gl.getUniformLocation(this.program, 'u_spectrumData'),
      sampleCount: gl.getUniformLocation(this.program, 'u_sampleCount'),
      minWavelength: gl.getUniformLocation(this.program, 'u_minWavelength'),
      maxWavelength: gl.getUniformLocation(this.program, 'u_maxWavelength'),
      maxValue: gl.getUniformLocation(this.program, 'u_maxValue'),
    }
  }

  private setupVertexAttributes(): void {
    const gl = this.gl

    const positionLoc = gl.getAttribLocation(this.program, 'a_position')
    gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer)
    gl.enableVertexAttribArray(positionLoc)
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0)
  }

  /** スペクトラムをレンダリング */
  render(spectrum: Spectrum): void {
    const gl = this.gl
    const canvas = gl.canvas as HTMLCanvasElement

    // Viewport設定
    gl.viewport(0, 0, canvas.width, canvas.height)

    // スペクトラムデータをテクスチャとしてアップロード
    // Float32ArrayをUint8Arrayに変換（WebGL1の制限）
    const maxValue = Math.max(...spectrum.values, 0.001)
    const normalizedData = new Uint8Array(spectrum.values.length)
    for (let i = 0; i < spectrum.values.length; i++) {
      normalizedData[i] = Math.min(255, Math.floor((spectrum.values[i]! / maxValue) * 255))
    }

    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.spectrumTexture)
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.LUMINANCE,
      spectrum.values.length,
      1,
      0,
      gl.LUMINANCE,
      gl.UNSIGNED_BYTE,
      normalizedData
    )

    // Uniformを設定
    gl.uniform1i(this.uniforms.spectrumData, 0)
    gl.uniform1f(this.uniforms.sampleCount, spectrum.values.length)
    gl.uniform1f(this.uniforms.minWavelength, spectrum.wavelengths[0] ?? VISIBLE_MIN_WAVELENGTH)
    gl.uniform1f(
      this.uniforms.maxWavelength,
      spectrum.wavelengths[spectrum.wavelengths.length - 1] ?? VISIBLE_MAX_WAVELENGTH
    )
    gl.uniform1f(this.uniforms.maxValue, 1.0) // 既に正規化済み

    // 描画
    gl.drawArrays(gl.TRIANGLES, 0, 6)
  }

  /** キャンバスサイズを更新 */
  resize(width: number, height: number): void {
    const canvas = this.gl.canvas as HTMLCanvasElement
    canvas.width = width
    canvas.height = height
  }

  /** リソース解放 */
  dispose(): void {
    const gl = this.gl
    gl.deleteTexture(this.spectrumTexture)
    gl.deleteBuffer(this.positionBuffer)
    gl.deleteProgram(this.program)
  }
}
