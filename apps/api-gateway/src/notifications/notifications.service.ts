import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventBridgeService } from '../shared/eventbridge/eventbridge.service';
import { DynamoDBService } from '../shared/dynamodb/dynamodb.service';
import { CreateNotificationDto } from './models/create-notification.dto';
import { Notification, NotificationStatus } from './models/notification.interface';

const NOTIFICATIONS_TABLE = 'notifications';

/**
 * Notifications service - business logic for notification management.
 */
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly eventBridgeService: EventBridgeService,
        private readonly dynamoDBService: DynamoDBService,
    ) { }

    /**
     * Creates a new notification request and publishes a NotificationRequested event.
     */
    async createNotification(dto: CreateNotificationDto): Promise<{ notificationId: string; status: string }> {
        const notificationId = randomUUID();
        
        this.logger.log(`📧 Creating notification request: ${notificationId}`);
        this.logger.log(`   Order: ${dto.orderId}, Channel: ${dto.channel}`);

        // Publish event to EventBridge with notificationId
        await this.eventBridgeService.publishEvent({
            source: 'notifications.service',
            detailType: 'NotificationRequested',
            detail: {
                notificationId,
                orderId: dto.orderId,
                message: dto.message,
                channel: dto.channel,
            },
        });

        this.logger.log(`✅ NotificationRequested event published for order: ${dto.orderId}`);

        return {
            notificationId,
            status: 'PENDING',
        };
    }

    /**
     * Retrieves a notification by ID from DynamoDB.
     */
    async getNotificationById(notificationId: string): Promise<Notification> {
        this.logger.log(`🔍 Fetching notification: ${notificationId}`);

        const item = await this.dynamoDBService.getItem(NOTIFICATIONS_TABLE, { notificationId });

        if (!item) {
            throw new NotFoundException(`Notification not found: ${notificationId}`);
        }

        return item as unknown as Notification;
    }

    /**
     * Lists all notifications from DynamoDB.
     */
    async listNotifications(): Promise<Notification[]> {
        this.logger.log('📋 Listing all notifications');
        const items = await this.dynamoDBService.scanItems(NOTIFICATIONS_TABLE);
        return items as unknown as Notification[];
    }
}
