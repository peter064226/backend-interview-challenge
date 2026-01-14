import { Module, Global } from '@nestjs/common';
import { EventBridgeService } from './eventbridge.service';

/**
 * Global EventBridge module for publishing events to AWS EventBridge.
 * In local development, connects to LocalStack.
 */
@Global()
@Module({
    providers: [EventBridgeService],
    exports: [EventBridgeService],
})
export class EventBridgeModule { }
