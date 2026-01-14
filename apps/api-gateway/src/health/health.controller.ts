import { Controller, Get } from '@nestjs/common';
import { HealthService, HealthStatus } from './health.service';

/**
 * Health check controller for liveness and readiness probes.
 */
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) { }

    /**
     * GET /health - Returns the health status of the API.
     */
    @Get()
    getHealth(): HealthStatus {
        return this.healthService.getHealthStatus();
    }
}
