/**
 * 3Dオブジェクトレンダラーポート
 *
 * Three.js等の3Dライブラリへの依存を隔離するためのインターフェース
 * 実装はInfra層で行い、ImageBitmapを境界として返す
 */

export interface LightingConfig {
  ambientIntensity?: number
  directionalIntensity?: number
  directionalPosition?: { x: number; y: number; z: number }
}

export interface Object3DRenderParams {
  width: number
  height: number
  cameraPosition: { x: number; y: number; z: number }
  modelTransform: {
    position: { x: number; y: number; z: number }
    rotation: { x: number; y: number; z: number }
    scale: number
  }
  lighting?: LightingConfig
  materialOverrides?: {
    color?: string
    metalness?: number
    roughness?: number
  }
}

export interface Object3DRendererPort {
  /**
   * GLTFまたはGLBモデルを読み込む
   */
  loadModel(url: string): Promise<void>

  /**
   * 現在のモデルをレンダリングしてImageBitmapを返す
   * 透過背景でレンダリングされる
   */
  renderFrame(params: Object3DRenderParams): Promise<ImageBitmap>

  /**
   * リソースを解放する
   */
  dispose(): void
}
