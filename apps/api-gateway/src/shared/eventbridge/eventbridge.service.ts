import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
    EventBridgeClient,
    PutEventsCommand,
    PutEventsRequestEntry,
} from '@aws-sdk/client-eventbridge';

export interface EventPayload {
    source: string;
    detailType: string;
    detail: Record<string, unknown>;
}

/**
 * Service for publishing events to AWS EventBridge.
 * Automatically connects to LocalStack in local development.
 */
@Injectable()
export class EventBridgeService implements OnModuleInit {
    private readonly logger = new Logger(EventBridgeService.name);
    private client: EventBridgeClient;
    private readonly eventBusName: string;

    constructor() {
        const stage = process.env.STAGE ?? 'local';
        this.eventBusName =
            process.env.EVENT_BUS_NAME ?? `${stage}.interview.eventbus`;

        const endpoint = process.env.AWS_ENDPOINT_URL ?? 'http://localhost:4566';
        const isLocal = stage === 'local' || endpoint.includes('localhost');

        this.client = new EventBridgeClient({
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

    onModuleInit(): void {
        this.logger.log(`📡 EventBridge connected to bus: ${this.eventBusName}`);
    }

    /**
     * Publishes an event to EventBridge.
     */
    async publishEvent(payload: EventPayload): Promise<void> {
        const entry: PutEventsRequestEntry = {
            EventBusName: this.eventBusName,
            Source: payload.source,
            DetailType: payload.detailType,
            Detail: JSON.stringify(payload.detail),
        };

        const command = new PutEventsCommand({ Entries: [entry] });

        try {
            const result = await this.client.send(command);
            this.logger.log(
                `✅ Event published: ${payload.detailType} (FailedCount: ${result.FailedEntryCount ?? 0})`,
            );
        } catch (error) {
            this.logger.error(`❌ Failed to publish event: ${payload.detailType}`, error);
            throw error;
        }
    }
}
