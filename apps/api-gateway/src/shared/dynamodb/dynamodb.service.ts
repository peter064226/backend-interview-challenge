import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
    DynamoDBDocumentClient,
    PutCommand,
    GetCommand,
    QueryCommand,
    ScanCommand,
} from '@aws-sdk/lib-dynamodb';

/**
 * Service for interacting with DynamoDB.
 * Automatically connects to LocalStack in local development.
 */
@Injectable()
export class DynamoDBService implements OnModuleInit {
    private readonly logger = new Logger(DynamoDBService.name);
    private docClient: DynamoDBDocumentClient;

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

    onModuleInit(): void {
        this.logger.log('📦 DynamoDB client initialized');
    }

    /**
     * Puts an item into a DynamoDB table.
     */
    async putItem(tableName: string, item: Record<string, unknown>): Promise<void> {
        const command = new PutCommand({
            TableName: tableName,
            Item: item,
        });

        await this.docClient.send(command);
        this.logger.log(`✅ Item saved to ${tableName}`);
    }

    /**
     * Gets an item from a DynamoDB table by key.
     */
    async getItem(
        tableName: string,
        key: Record<string, unknown>,
    ): Promise<Record<string, unknown> | undefined> {
        const command = new GetCommand({
            TableName: tableName,
            Key: key,
        });

        const result = await this.docClient.send(command);
        return result.Item;
    }

    /**
     * Queries items from a DynamoDB table.
     */
    async queryItems(
        tableName: string,
        keyConditionExpression: string,
        expressionAttributeValues: Record<string, unknown>,
    ): Promise<Record<string, unknown>[]> {
        const command = new QueryCommand({
            TableName: tableName,
            KeyConditionExpression: keyConditionExpression,
            ExpressionAttributeValues: expressionAttributeValues,
        });

        const result = await this.docClient.send(command);
        return result.Items ?? [];
    }

    /**
     * Scans all items from a DynamoDB table.
     */
    async scanItems(tableName: string): Promise<Record<string, unknown>[]> {
        const command = new ScanCommand({
            TableName: tableName,
        });

        const result = await this.docClient.send(command);
        return result.Items ?? [];
    }
}
