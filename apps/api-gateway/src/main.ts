import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

/**
 * API Gateway bootstrap function.
 * Starts the NestJS application on port 3000.
 */
async function bootstrap(): Promise<void> {
    const logger = new Logger('Bootstrap');
    const app = await NestFactory.create(AppModule);

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
    );

    app.enableCors();

    const port = process.env.PORT ?? 3000;
    await app.listen(port);

    logger.log(`🚀 API Gateway is running on: http://localhost:${port}`);
    logger.log(`📊 Health check: http://localhost:${port}/health`);
}

bootstrap().catch((error) => {
    console.error('❌ Failed to start API Gateway:', error);
    process.exit(1);
});
