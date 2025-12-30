/**
 * useThreeObject
 *
 * Three.jsでGLTFモデルをオフスクリーンレンダリングし、ImageBitmapとして取得する
 * 静的レンダリング用（毎フレーム更新ではない）
 */

import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'

export interface ThreeObjectOptions {
  width: number
  height: number
}

export interface ThreeObjectRenderer {
  loadModel: (url: string) => Promise<void>
  render: () => Promise<ImageBitmap>
  dispose: () => void
}

/**
 * Three.jsオフスクリーンレンダラーを作成
 * GLTFモデルを読み込み、透明背景でレンダリングしてImageBitmapを返す
 */
export const createThreeObjectRenderer = (options: ThreeObjectOptions): ThreeObjectRenderer => {
  const { width, height } = options

  // オフスクリーンキャンバス
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  // Three.jsセットアップ
  const scene = new THREE.Scene()

  const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000)
  camera.position.set(0, 0, 3)
  camera.lookAt(0, 0, 0)

  const renderer = new THREE.WebGLRenderer({
    canvas,
    alpha: true,
    antialias: true,
    preserveDrawingBuffer: true,
  })
  renderer.setSize(width, height)
  renderer.setClearColor(0x000000, 0) // 完全透明

  // ライティング
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
  scene.add(ambientLight)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)

  // GLTFローダー
  const loader = new GLTFLoader()
  let currentModel: THREE.Object3D | null = null

  const loadModel = async (url: string): Promise<void> => {
    // 既存モデルを削除
    if (currentModel) {
      scene.remove(currentModel)
      currentModel = null
    }

    return new Promise((resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const model = gltf.scene

          // モデルを中央に配置し、適切なサイズにスケール
          const box = new THREE.Box3().setFromObject(model)
          const size = box.getSize(new THREE.Vector3())
          const center = box.getCenter(new THREE.Vector3())

          // 最大サイズを1.5に正規化
          const maxDim = Math.max(size.x, size.y, size.z)
          const scale = 1.5 / maxDim
          model.scale.setScalar(scale)

          // 中央に配置
          model.position.sub(center.multiplyScalar(scale))

          scene.add(model)
          currentModel = model
          resolve()
        },
        undefined,
        reject
      )
    })
  }

  const render = async (): Promise<ImageBitmap> => {
    renderer.render(scene, camera)

    // canvasからImageBitmapを作成
    return new Promise((resolve, reject) => {
      canvas.toBlob(async (blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob from canvas'))
          return
        }
        try {
          const bitmap = await createImageBitmap(blob)
          resolve(bitmap)
        } catch (e) {
          reject(e)
        }
      }, 'image/png')
    })
  }

  const dispose = () => {
    if (currentModel) {
      scene.remove(currentModel)
      currentModel = null
    }
    renderer.dispose()
  }

  return {
    loadModel,
    render,
    dispose,
  }
}
