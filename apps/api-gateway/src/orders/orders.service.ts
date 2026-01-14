import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { EventBridgeService } from '../shared/eventbridge/eventbridge.service';
import { DynamoDBService } from '../shared/dynamodb/dynamodb.service';
import { CreateOrderDto } from './models/create-order.dto';
import { Order, OrderStatus } from './models/order.interface';

const ORDERS_TABLE = 'orders';

/**
 * Orders service - business logic for order management.
 */
@Injectable()
export class OrdersService {
    private readonly logger = new Logger(OrdersService.name);

    constructor(
        private readonly eventBridgeService: EventBridgeService,
        private readonly dynamoDBService: DynamoDBService,
    ) { }

    /**
     * Creates a new order and publishes an OrderCreated event.
     */
    async createOrder(dto: CreateOrderDto): Promise<Order> {
        const order: Order = {
            orderId: randomUUID(),
            customerId: dto.customerId,
            items: dto.items,
            totalAmount: dto.totalAmount,
            status: OrderStatus.PENDING,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Save to DynamoDB
        await this.dynamoDBService.putItem(ORDERS_TABLE, order);
        this.logger.log(`✅ Order saved: ${order.orderId}`);

        // Publish event to EventBridge
        await this.eventBridgeService.publishEvent({
            source: 'orders.service',
            detailType: 'OrderCreated',
            detail: {
                orderId: order.orderId,
                customerId: order.customerId,
                totalAmount: order.totalAmount,
                itemCount: order.items.length,
            },
        });

        return order;
    }

    /**
     * Retrieves an order by ID from DynamoDB.
     */
    async getOrderById(orderId: string): Promise<Order | null> {
        const item = await this.dynamoDBService.getItem(ORDERS_TABLE, { orderId });
        return item ? (item as unknown as Order) : null;
    }

    /**
     * Lists all orders from DynamoDB.
     */
    async listOrders(): Promise<Order[]> {
        const items = await this.dynamoDBService.scanItems(ORDERS_TABLE);
        return items as unknown as Order[];
    }
}
