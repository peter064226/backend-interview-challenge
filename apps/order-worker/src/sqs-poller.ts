import {
    SQSClient,
    ReceiveMessageCommand,
    DeleteMessageCommand,
    GetQueueUrlCommand,
    Message,
} from '@aws-sdk/client-sqs';
import { Logger } from './utils/logger';
import { MessageProcessor } from './processors/processor.interface';

/**
 * SQS Poller - polls messages from SQS and processes them.
 * Supports LocalStack for local development.
 */
export class SQSPoller {
    private readonly logger = new Logger('SQSPoller');
    private readonly client: SQSClient;
    private queueUrl: string | null = null;
    private isRunning = false;

    constructor(
        private readonly queueName: string,
        private readonly processor: MessageProcessor,
    ) {
        const stage = process.env.STAGE ?? 'local';
        const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
        const isLocal = stage === 'local' || endpoint.includes('localhost');

        this.client = new SQSClient({
            region: process.env.AWS_REGION ?? 'us-west-2',
            ...(isLocal && {
                endpoint,
                credentials: {
                    accessKeyId: 'test',
                    secretAccessKey: 'test',
                },
            }),
        });
    }

    /**
     * Starts the SQS polling loop.
     */
    async start(): Promise<void> {
        this.logger.log(`📡 Starting SQS poller for queue: ${this.queueName}`);

        // Get queue URL
        try {
            const urlCommand = new GetQueueUrlCommand({ QueueName: this.queueName });
            const urlResult = await this.client.send(urlCommand);
            this.queueUrl = urlResult.QueueUrl ?? null;

            if (!this.queueUrl) {
                throw new Error(`Queue not found: ${this.queueName}`);
            }

            this.logger.log(`✅ Connected to queue: ${this.queueUrl}`);
        } catch (error) {
            this.logger.error(`❌ Failed to get queue URL: ${this.queueName}`, error);
            throw error;
        }

        this.isRunning = true;
        await this.pollLoop();
    }

    /**
     * Stops the SQS polling loop.
     */
    async stop(): Promise<void> {
        this.logger.log('🛑 Stopping SQS poller...');
        this.isRunning = false;
    }

    /**
     * Main polling loop.
     */
    private async pollLoop(): Promise<void> {
        while (this.isRunning) {
            try {
                const messages = await this.receiveMessages();

                for (const message of messages) {
                    await this.processMessage(message);
                }
            } catch (error) {
                this.logger.error('❌ Error in poll loop:', error);
                await this.sleep(5000); // Wait before retrying
            }
        }
    }

    /**
     * Receives messages from SQS.
     */
    private async receiveMessages(): Promise<Message[]> {
        if (!this.queueUrl) {
            return [];
        }

        const command = new ReceiveMessageCommand({
            QueueUrl: this.queueUrl,
            MaxNumberOfMessages: 10,
            WaitTimeSeconds: 20, // Long polling
            VisibilityTimeout: 30,
        });

        const result = await this.client.send(command);
        return result.Messages ?? [];
    }

    /**
     * Processes a single message and deletes it on success.
     */
    private async processMessage(message: Message): Promise<void> {
        if (!message.Body || !message.ReceiptHandle || !this.queueUrl) {
            return;
        }

        this.logger.log(`📨 Processing message: ${message.MessageId}`);

        try {
            // Parse EventBridge wrapped message
            const eventBridgeMessage = JSON.parse(message.Body);
            const detail = eventBridgeMessage.detail ?? JSON.parse(message.Body);

            await this.processor.process(detail);

            // Delete message on success
            const deleteCommand = new DeleteMessageCommand({
                QueueUrl: this.queueUrl,
                ReceiptHandle: message.ReceiptHandle,
            });
            await this.client.send(deleteCommand);

            this.logger.log(`✅ Message processed and deleted: ${message.MessageId}`);
        } catch (error) {
            this.logger.error(`❌ Failed to process message: ${message.MessageId}`, error);
            // Message will be retried after visibility timeout
        }
    }

    /**
     * Helper function to sleep for a given duration.
     */
    private sleep(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }
}
