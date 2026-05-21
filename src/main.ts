import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation — strips unknown properties and validates DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // strip properties not in the DTO
      forbidNonWhitelisted: true,
      transform: true,        // auto-cast route params / query strings
    }),
  );

  // CORS — adjust origin for production
  app.enableCors();

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`BioPoints API running on http://localhost:${port}`);
}

bootstrap();
