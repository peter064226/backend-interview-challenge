import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * Orders module - handles order creation and retrieval.
 * Demonstrates EventBridge + DynamoDB integration.
 */
@Module({
    controllers: [OrdersController],
    providers: [OrdersService],
})
export class OrdersModule { }
