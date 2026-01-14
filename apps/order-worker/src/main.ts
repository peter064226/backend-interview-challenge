import 'reflect-metadata';
import { Logger } from './utils/logger';
import { SQSPoller } from './sqs-poller';
import { OrderProcessor } from './processors/order.processor';

const logger = new Logger('Main');

/**
 * Main entry point for the Order Worker.
 * Starts the SQS poller to process order events.
 */
async function main(): Promise<void> {
    logger.log('🚀 Starting Order Worker...');

    const stage = process.env.STAGE ?? 'local';
    const queueName = process.env.ORDER_QUEUE_NAME ?? `${stage}-order-processing-queue`;

    const processor = new OrderProcessor();
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
