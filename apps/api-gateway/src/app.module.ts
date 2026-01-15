import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { NotificationsModule } from './notifications/notifications.module';
import { EventBridgeModule } from './shared/eventbridge/eventbridge.module';
import { DynamoDBModule } from './shared/dynamodb/dynamodb.module';

/**
 * Root application module.
 * Imports all feature modules and shared infrastructure modules.
 */
@Module({
    imports: [
        // Infrastructure modules
        EventBridgeModule,
        DynamoDBModule,
        // Feature modules
        HealthModule,
        OrdersModule,
        NotificationsModule,
    ],
})
export class AppModule { }
