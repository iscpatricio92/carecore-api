import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
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

This API uses JWT Bearer Token Authentication with Keycloak. All protected endpoints require a valid JWT token in the Authorization header.

> ⚠️ **Security Notice**: This Swagger UI is for development and testing purposes only.
> In production, Swagger UI should be disabled or protected with additional authentication.
> Never expose Swagger UI publicly in production without proper security measures.

### How to Authenticate in Swagger UI

1. Get an Access Token:
   - Use the POST /api/auth/login?returnUrl=true endpoint to get the Keycloak authorization URL
   - Open the URL in your browser and complete the OAuth2 flow
   - After successful authentication, you'll receive an access token

2. Authorize in Swagger:
   - Click the "Authorize" button at the top right of the Swagger UI
   - In the "JWT-auth" section, enter your access token (without the "Bearer " prefix)
   - Click "Authorize" and then "Close"

3. Use Protected Endpoints:
   - All protected endpoints will now automatically include your token in requests
   - The token will persist across page reloads (if persistAuthorization is enabled)

### Manual Token Usage

If you're using the API outside of Swagger UI, include the token in the request header:

Authorization: Bearer <your-access-token>

### Token Refresh

If your access token expires, use the POST /api/auth/refresh endpoint with your refresh token to get a new access token.

### Available Roles

The following roles are available in the system:
- patient - Patient user
- practitioner - Medical professional
- viewer - Temporary read-only access
- lab - Laboratory system
- insurer - Insurance system
- system - External system integration
- admin - Administrator
- audit - Audit and compliance
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

  // Only enable Swagger in non-production environments
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    const document = SwaggerModule.createDocument(app, config, {
      operationIdFactory: (_controllerKey: string, methodKey: string) => methodKey,
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
  }

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api`);
  if (!isProduction) {
    console.log(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  } else {
    console.log(`🔒 Swagger UI is disabled in production for security`);
  }
}

bootstrap();
