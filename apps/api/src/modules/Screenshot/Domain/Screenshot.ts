export type Screenshot = {
  url: string
  image: Buffer
  width: number
  height: number
  capturedAt: Date
}

export type CreateScreenshotInput = {
  url: string
  image: Buffer
  width: number
  height: number
}

export const $Screenshot = {
  create: (input: CreateScreenshotInput): Screenshot => ({
    url: input.url,
    image: input.image,
    width: input.width,
    height: input.height,
    capturedAt: new Date(),
  }),
}
