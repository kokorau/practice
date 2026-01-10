/**
 * Three.jsによる3Dオブジェクトレンダラー実装
 *
 * - 動的importでThree.jsを読み込み（未使用時はロードされない）
 * - OffscreenCanvasを使用してDOMに追加しない
 * - 透過背景でレンダリングしてImageBitmapとして出力
 */

import type {
  Object3DRendererPort,
  Object3DRenderParams,
} from '../Application/ports/Object3DRendererPort'

// Three.jsの型（動的importのため）
type Three = typeof import('three')
type GLTFLoader = import('three/examples/jsm/loaders/GLTFLoader.js').GLTFLoader
type GLTF = import('three/examples/jsm/loaders/GLTFLoader.js').GLTF

export class ThreeJsObject3DRenderer implements Object3DRendererPort {
  private three: Three | null = null
  private canvas: OffscreenCanvas | null = null
  private renderer: import('three').WebGLRenderer | null = null
  private scene: import('three').Scene | null = null
  private camera: import('three').PerspectiveCamera | null = null
  private model: import('three').Group | null = null
  private gltfLoader: GLTFLoader | null = null

  private async ensureThreeLoaded(): Promise<Three> {
    if (this.three) return this.three
    this.three = await import('three')
    return this.three
  }

  private async ensureGLTFLoaderLoaded(): Promise<GLTFLoader> {
    if (this.gltfLoader) return this.gltfLoader
    const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js')
    this.gltfLoader = new GLTFLoader()
    return this.gltfLoader
  }

  private async ensureRendererInitialized(
    width: number,
    height: number
  ): Promise<void> {
    const THREE = await this.ensureThreeLoaded()

    // キャンバスサイズが変わった場合は再作成
    if (this.canvas && (this.canvas.width !== width || this.canvas.height !== height)) {
      this.disposeRenderer()
    }

    if (!this.canvas) {
      this.canvas = new OffscreenCanvas(width, height)
    }

    if (!this.renderer) {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        alpha: true, // 透過背景
        antialias: true,
        preserveDrawingBuffer: true,
      })
      this.renderer.setSize(width, height, false)
      this.renderer.setClearColor(0x000000, 0) // 完全透明
    }

    if (!this.scene) {
      this.scene = new THREE.Scene()
    }

    if (!this.camera) {
      this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000)
    } else {
      this.camera.aspect = width / height
      this.camera.updateProjectionMatrix()
    }
  }

  async loadModel(url: string): Promise<void> {
    const THREE = await this.ensureThreeLoaded()
    const loader = await this.ensureGLTFLoaderLoaded()

    // 既存モデルがあれば削除
    if (this.model && this.scene) {
      this.scene.remove(this.model)
      this.disposeModel(this.model)
      this.model = null
    }

    const gltf: GLTF = await new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => reject(error)
      )
    })

    this.model = gltf.scene

    // モデルのバウンディングボックスを計算して正規化
    const box = new THREE.Box3().setFromObject(this.model)
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    if (maxDim > 0) {
      const scale = 2 / maxDim // 正規化して最大サイズを2に
      this.model.scale.setScalar(scale)
    }

    // 中心に配置
    const center = box.getCenter(new THREE.Vector3())
    this.model.position.sub(center.multiplyScalar(this.model.scale.x))
  }

  async renderFrame(params: Object3DRenderParams): Promise<ImageBitmap> {
    const THREE = await this.ensureThreeLoaded()
    await this.ensureRendererInitialized(params.width, params.height)

    if (!this.scene || !this.camera || !this.renderer || !this.canvas) {
      throw new Error('Renderer not initialized')
    }

    // シーンをクリアして再構築
    while (this.scene.children.length > 0) {
      const child = this.scene.children[0]
      if (child) this.scene.remove(child)
    }

    // ライティング設定
    const lighting = params.lighting ?? {}
    const ambientLight = new THREE.AmbientLight(
      0xffffff,
      lighting.ambientIntensity ?? 0.6
    )
    this.scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(
      0xffffff,
      lighting.directionalIntensity ?? 0.8
    )
    const dirPos = lighting.directionalPosition ?? { x: 5, y: 5, z: 5 }
    directionalLight.position.set(dirPos.x, dirPos.y, dirPos.z)
    this.scene.add(directionalLight)

    // モデルを追加してトランスフォーム適用
    if (this.model) {
      const modelClone = this.model.clone()

      // マテリアルオーバーライドを適用
      if (params.materialOverrides) {
        type ThreeMesh = import('three').Mesh
        type ThreeMeshStandardMaterial = import('three').MeshStandardMaterial
        modelClone.traverse((child) => {
          if ((child as ThreeMesh).isMesh) {
            const mesh = child as ThreeMesh
            const material = mesh.material as ThreeMeshStandardMaterial
            if (material && material.isMeshStandardMaterial) {
              if (params.materialOverrides?.color) {
                material.color.set(params.materialOverrides.color)
              }
              if (params.materialOverrides?.metalness !== undefined) {
                material.metalness = params.materialOverrides.metalness
              }
              if (params.materialOverrides?.roughness !== undefined) {
                material.roughness = params.materialOverrides.roughness
              }
            }
          }
        })
      }

      // トランスフォーム適用
      const { position, rotation, scale } = params.modelTransform
      modelClone.position.set(position.x, position.y, position.z)
      modelClone.rotation.set(rotation.x, rotation.y, rotation.z)
      modelClone.scale.multiplyScalar(scale)

      this.scene.add(modelClone)
    }

    // カメラ位置設定
    this.camera.position.set(
      params.cameraPosition.x,
      params.cameraPosition.y,
      params.cameraPosition.z
    )
    this.camera.lookAt(0, 0, 0)

    // レンダリング
    this.renderer.render(this.scene, this.camera)

    // ImageBitmapとして返す
    return this.canvas.transferToImageBitmap()
  }

  dispose(): void {
    this.disposeRenderer()
    if (this.model) {
      this.disposeModel(this.model)
      this.model = null
    }
    this.three = null
    this.gltfLoader = null
  }

  private disposeRenderer(): void {
    if (this.renderer) {
      this.renderer.dispose()
      this.renderer = null
    }
    if (this.scene) {
      while (this.scene.children.length > 0) {
        const child = this.scene.children[0]
        if (child) this.scene.remove(child)
      }
      this.scene = null
    }
    this.camera = null
    this.canvas = null
  }

  private disposeModel(object: import('three').Object3D): void {
    object.traverse((child) => {
      if ((child as import('three').Mesh).isMesh) {
        const mesh = child as import('three').Mesh
        if (mesh.geometry) mesh.geometry.dispose()
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((m) => m.dispose())
          } else {
            mesh.material.dispose()
          }
        }
      }
    })
  }
}

/**
 * ファクトリー関数
 * 将来的にBabylon.js等への切り替えを容易にする
 */
export function createObject3DRenderer(
  _type: 'threejs' = 'threejs'
): Object3DRendererPort {
  return new ThreeJsObject3DRenderer()
}
