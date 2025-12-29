/**
 * Texture render specification
 * Contains shader code and uniform data for rendering
 */
export interface TextureRenderSpec {
  /** WGSL shader code */
  shader: string
  /** Uniform buffer data */
  uniforms: ArrayBuffer
  /** Buffer size in bytes (must be 16-byte aligned) */
  bufferSize: number
  /** Blend state for compositing (optional, for masks) */
  blend?: GPUBlendState
}
