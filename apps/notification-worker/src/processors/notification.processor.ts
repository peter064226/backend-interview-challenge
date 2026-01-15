import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '../utils/logger';
import { MessageProcessor } from './processor.interface';
import { randomUUID } from 'crypto';

const NOTIFICATIONS_TABLE = 'notifications';

/**
 * Notification processor - handles NotificationRequested events.
 * Creates notification records in DynamoDB.
 */
export class NotificationProcessor implements MessageProcessor {
    private readonly logger = new Logger('NotificationProcessor');
    private readonly docClient: DynamoDBDocumentClient;

    constructor() {
        const stage = process.env.STAGE ?? 'local';
        const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
        const isLocal = stage === 'local' || endpoint.includes('localhost');

        const client = new DynamoDBClient({
            region: process.env.AWS_REGION ?? 'us-west-2',
            ...(isLocal && {
                endpoint,
                credentials: {
                    accessKeyId: 'test',
                    secretAccessKey: 'test',
                },
            }),
        });

        this.docClient = DynamoDBDocumentClient.from(client);
    }

    /**
     * Processes a NotificationRequested event.
     */
    async process(payload: Record<string, unknown>): Promise<void> {
        const orderId = payload.orderId as string;
        const message = payload.message as string;
        const channel = payload.channel as string;

        if (!orderId || !message || !channel) {
            this.logger.error('❌ Missing required fields in payload');
            return;
        }

        this.logger.log(`📧 Processing notification for order: ${orderId}`);
        this.logger.log(`   Channel: ${channel}`);
        this.logger.log(`   Message: ${message}`);

        const notificationId = randomUUID();
        const now = new Date().toISOString();

        // Simulate sending notification
        await this.simulateSending(channel);

        // Save notification record to DynamoDB
        const notification = {
            notificationId,
            orderId,
            message,
            channel,
            status: 'SENT',
            createdAt: now,
            sentAt: now,
        };

        await this.saveNotification(notification);

        this.logger.log(`✅ Notification sent successfully: ${notificationId}`);
    }

    /**
     * Saves the notification record to DynamoDB.
     */
    private async saveNotification(notification: Record<string, unknown>): Promise<void> {
        const command = new PutCommand({
            TableName: NOTIFICATIONS_TABLE,
            Item: notification,
        });

        try {
            await this.docClient.send(command);
            this.logger.log(`   📝 Notification saved to DynamoDB`);
        } catch (error) {
            this.logger.error(`❌ Failed to save notification`, error);
            throw error;
        }
    }

    /**
     * Simulates sending a notification.
     */
    private async simulateSending(channel: string): Promise<void> {
        const sendingTimeMs = 500 + Math.random() * 1000;
        this.logger.log(`   ⏳ Sending ${channel} notification... (${Math.round(sendingTimeMs)}ms)`);
        await new Promise((resolve) => setTimeout(resolve, sendingTimeMs));
    }
}
