import { Injectable } from '@nestjs/common';

export interface HealthStatus {
    status: 'healthy' | 'unhealthy';
    service: string;
    timestamp: string;
    uptime: number;
}

/**
 * Health service for API status checks.
 */
@Injectable()
export class HealthService {
    private readonly startTime: Date = new Date();

    /**
     * Returns the current health status of the service.
     */
    getHealthStatus(): HealthStatus {
        const uptimeMs = Date.now() - this.startTime.getTime();
        const uptimeSeconds = Math.floor(uptimeMs / 1000);

        return {
            status: 'healthy',
            service: 'api-gateway',
            timestamp: new Date().toISOString(),
            uptime: uptimeSeconds,
        };
    }
}
