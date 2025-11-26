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
      `API for digital medical records platform based on FHIR R4.

## Features
- ✅ FHIR R4 Resources (Patient, Practitioner, Encounter, DocumentReference, Consent)
- ✅ JWT Bearer Token Authentication
- ✅ Data validation with class-validator
- ✅ Pagination and filtering
- ✅ Complete DTOs and Schemas documentation

## Authentication
This API uses JWT authentication. To use protected endpoints, include the token in the header:
\`\`\`
Authorization: Bearer <your-token>
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
    .addTag('FHIR', 'FHIR R4 Resources')
    .addTag('Patients', 'Patient management')
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
      persistAuthorization: true, // Keeps token after reload
      displayRequestDuration: true, // Shows response time
      filter: true, // Enables search filter
      showExtensions: true, // Shows OpenAPI extensions
      showCommonExtensions: true,
      docExpansion: 'list', // 'none', 'list', 'full'
      defaultModelsExpandDepth: 2, // Schema expansion depth
      defaultModelExpandDepth: 2, // Model expansion depth
      displayOperationId: false, // Hides operationId in UI
      tryItOutEnabled: true, // Enables "Try it out"
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
