export type Photo = {
  imageData: ImageData
  width: number
  height: number
}

export const $Photo = {
  create: (imageData: ImageData): Photo => ({
    imageData,
    width: imageData.width,
    height: imageData.height,
  }),
}
