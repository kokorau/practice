import { Hono } from 'hono'
import { serve } from '@hono/node-server'
import { cors } from 'hono/cors'
import { captureScreenshotUseCase } from './modules/Screenshot/Application/captureScreenshotUseCase'

const app = new Hono()

const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:5173']

app.use('*', cors({
  origin: corsOrigins,
}))

app.get('/', (c) => {
  return c.json({ message: 'Screenshot API' })
})

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/screenshot', async (c) => {
  const url = c.req.query('url')

  if (!url) {
    return c.json({ error: 'url parameter is required' }, 400)
  }

  try {
    const screenshot = await captureScreenshotUseCase({ url })

    return new Response(new Uint8Array(screenshot.image), {
      headers: {
        'Content-Type': 'image/png',
      },
    })
  } catch (error) {
    return c.json({ error: 'Failed to capture screenshot', details: String(error) }, 500)
  }
})

const port = Number(process.env.PORT) || 3001

serve({
  fetch: app.fetch,
  port,
})

console.log(`Server running on port ${port}`)
