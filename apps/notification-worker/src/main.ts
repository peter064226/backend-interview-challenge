import 'reflect-metadata';
import { Logger } from './utils/logger';
import { SQSPoller } from './sqs-poller';
import { NotificationProcessor } from './processors/notification.processor';

const logger = new Logger('Main');

/**
 * Main entry point for the Notification Worker.
 * Starts the SQS poller to process notification events.
 */
async function main(): Promise<void> {
    logger.log('🚀 Starting Notification Worker...');

    const stage = process.env.STAGE ?? 'local';
    const queueName = process.env.NOTIFICATION_QUEUE_NAME ?? `${stage}-notification-queue`;

    const processor = new NotificationProcessor();
    const poller = new SQSPoller(queueName, processor);

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
        logger.log('🛑 Received SIGINT, shutting down...');
        await poller.stop();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        logger.log('🛑 Received SIGTERM, shutting down...');
        await poller.stop();
        process.exit(0);
    });

    await poller.start();
}

main().catch((error) => {
    console.error('❌ Worker failed to start:', error);
    process.exit(1);
});
