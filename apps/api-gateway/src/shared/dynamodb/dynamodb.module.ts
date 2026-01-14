import { Module, Global } from '@nestjs/common';
import { DynamoDBService } from './dynamodb.service';

/**
 * Global DynamoDB module for data persistence.
 * In local development, connects to LocalStack.
 */
@Global()
@Module({
    providers: [DynamoDBService],
    exports: [DynamoDBService],
})
export class DynamoDBModule { }
