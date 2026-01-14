import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

/**
 * Health check module for API liveness and readiness probes.
 */
@Module({
    controllers: [HealthController],
    providers: [HealthService],
})
export class HealthModule { }
