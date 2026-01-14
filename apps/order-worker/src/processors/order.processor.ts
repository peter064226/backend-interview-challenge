import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { Logger } from '../utils/logger';
import { MessageProcessor } from './processor.interface';

const ORDERS_TABLE = 'orders';
const PROCESSED_ORDERS_TABLE = 'processed-orders';

/**
 * Order processor - handles OrderCreated events.
 * Updates order status and creates a processed order record.
 */
export class OrderProcessor implements MessageProcessor {
    private readonly logger = new Logger('OrderProcessor');
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
     * Processes an OrderCreated event.
     */
    async process(payload: Record<string, unknown>): Promise<void> {
        const orderId = payload.orderId as string;
        const customerId = payload.customerId as string;
        const totalAmount = payload.totalAmount as number;

        if (!orderId) {
            this.logger.error('❌ Missing orderId in payload');
            return;
        }

        this.logger.log(`📦 Processing order: ${orderId}`);
        this.logger.log(`   Customer: ${customerId}`);
        this.logger.log(`   Amount: $${totalAmount}`);

        // Update order status to PROCESSING
        await this.updateOrderStatus(orderId, 'PROCESSING');

        // Simulate some processing work
        await this.simulateProcessing();

        // Update order status to COMPLETED
        await this.updateOrderStatus(orderId, 'COMPLETED');

        this.logger.log(`✅ Order processed successfully: ${orderId}`);
    }

    /**
     * Updates the order status in DynamoDB.
     */
    private async updateOrderStatus(orderId: string, status: string): Promise<void> {
        const command = new UpdateCommand({
            TableName: ORDERS_TABLE,
            Key: { orderId },
            UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
            ExpressionAttributeNames: {
                '#status': 'status',
            },
            ExpressionAttributeValues: {
                ':status': status,
                ':updatedAt': new Date().toISOString(),
            },
        });

        try {
            await this.docClient.send(command);
            this.logger.log(`   📝 Order status updated to: ${status}`);
        } catch (error) {
            this.logger.error(`❌ Failed to update order status: ${orderId}`, error);
            throw error;
        }
    }

    /**
     * Simulates processing work.
     */
    private async simulateProcessing(): Promise<void> {
        const processingTimeMs = 1000 + Math.random() * 2000;
        this.logger.log(`   ⏳ Processing... (${Math.round(processingTimeMs)}ms)`);
        await new Promise((resolve) => setTimeout(resolve, processingTimeMs));
    }
}
