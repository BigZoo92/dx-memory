import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  // Wide-open CORS so the web app (on another port) can talk to us in dev and in docker.
  app.enableCors()
  const port = process.env.PORT ? Number(process.env.PORT) : 3101
  await app.listen(port)
  // Console-only logging. There is no structured logging or request correlation.
  console.log(`[friction-api] listening on http://localhost:${port}`)
}

bootstrap()
