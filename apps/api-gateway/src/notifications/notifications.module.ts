import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

/**
 * Notifications module - handles notification creation and retrieval.
 * Demonstrates EventBridge + DynamoDB integration for async notification processing.
 */
@Module({
    controllers: [NotificationsController],
    providers: [NotificationsService],
})
export class NotificationsModule { }
