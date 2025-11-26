import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  // Security middleware
  app.use(helmet());
  app.use(compression());
  app.use(cookieParser());

  // Rate limiting
  const limiter = rateLimit({
    windowMs: (configService.get<number>('RATE_LIMIT_TTL') || 60) * 1000,
    max: configService.get<number>('RATE_LIMIT_MAX') || 100,
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api', limiter);

  // CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || '*',
    credentials: true,
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CareCore API')
    .setDescription(
      `API para plataforma de historial médico digital basada en FHIR R4.

## Características
- ✅ Recursos FHIR R4 (Patient, Practitioner, Encounter, DocumentReference, Consent)
- ✅ Autenticación JWT Bearer Token
- ✅ Validación de datos con class-validator
- ✅ Paginación y filtrado
- ✅ Documentación completa de DTOs y Schemas

## Autenticación
Esta API utiliza autenticación JWT. Para usar los endpoints protegidos, incluye el token en el header:
\`\`\`
Authorization: Bearer <tu-token>
\`\`\`
      `,
    )
    .setVersion('1.0.0')
    .setContact('Patricio', 'https://github.com/iscpatricio92', 'isc.patricio@gmail.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000', 'Development Server')
    .addServer('https://api.carecore.example.com', 'Production Server')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth', // This name here is important for matching up with @ApiBearerAuth() in your controller!
    )
    .addTag('Health', 'Health check endpoints')
    .addTag('FHIR', 'Recursos FHIR R4')
    .addTag('Patients', 'Gestión de pacientes')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-API-Key',
        in: 'header',
        description: 'API Key for external services',
      },
      'api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    operationIdFactory: (controllerKey: string, methodKey: string) => methodKey,
    deepScanRoutes: true,
  });

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Mantiene el token después de recargar
      displayRequestDuration: true, // Muestra tiempo de respuesta
      filter: true, // Habilita filtro de búsqueda
      showExtensions: true, // Muestra extensiones OpenAPI
      showCommonExtensions: true,
      docExpansion: 'list', // 'none', 'list', 'full'
      defaultModelsExpandDepth: 2, // Profundidad de expansión de schemas
      defaultModelExpandDepth: 2, // Profundidad de expansión de modelos
      displayOperationId: false, // Oculta operationId en la UI
      tryItOutEnabled: true, // Habilita "Try it out"
    },
    customSiteTitle: 'CareCore API Documentation',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { margin: 20px 0; }
    `,
  });

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
}

bootstrap();
