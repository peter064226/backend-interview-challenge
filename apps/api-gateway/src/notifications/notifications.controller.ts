import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './models/create-notification.dto';
import { Notification } from './models/notification.interface';

/**
 * Notifications controller - REST API for notification management.
 */
@Controller('api/notifications')
export class NotificationsController {
    private readonly logger = new Logger(NotificationsController.name);

    constructor(private readonly notificationsService: NotificationsService) { }

    /**
     * POST /api/notifications - Creates a new notification request.
     * This will:
     * 1. Publish a NotificationRequested event to EventBridge
     * 2. Return the notification ID and pending status
     * 
     * The actual notification will be processed asynchronously by the notification-worker.
     */
    @Post()
    async createNotification(
        @Body() createNotificationDto: CreateNotificationDto,
    ): Promise<{ notificationId: string; status: string }> {
        this.logger.log(`📧 Creating notification: ${JSON.stringify(createNotificationDto)}`);
        return this.notificationsService.createNotification(createNotificationDto);
    }

    /**
     * GET /api/notifications/:notificationId - Retrieves a notification by ID.
     */
    @Get(':notificationId')
    async getNotification(@Param('notificationId') notificationId: string): Promise<Notification> {
        this.logger.log(`🔍 Fetching notification: ${notificationId}`);
        return this.notificationsService.getNotificationById(notificationId);
    }

    /**
     * GET /api/notifications - Lists all notifications.
     */
    @Get()
    async listNotifications(): Promise<Notification[]> {
        this.logger.log('📋 Listing all notifications');
        return this.notificationsService.listNotifications();
    }
}
