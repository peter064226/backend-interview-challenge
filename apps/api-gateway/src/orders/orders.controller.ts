import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './models/create-order.dto';
import { Order } from './models/order.interface';

/**
 * Orders controller - REST API for order management.
 */
@Controller('api/orders')
export class OrdersController {
    private readonly logger = new Logger(OrdersController.name);

    constructor(private readonly ordersService: OrdersService) { }

    /**
     * POST /api/orders - Creates a new order.
     * This will:
     * 1. Save the order to DynamoDB
     * 2. Publish an OrderCreated event to EventBridge
     */
    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
        this.logger.log(`📦 Creating order: ${JSON.stringify(createOrderDto)}`);
        return this.ordersService.createOrder(createOrderDto);
    }

    /**
     * GET /api/orders/:orderId - Retrieves an order by ID.
     */
    @Get(':orderId')
    async getOrder(@Param('orderId') orderId: string): Promise<Order | null> {
        this.logger.log(`🔍 Fetching order: ${orderId}`);
        return this.ordersService.getOrderById(orderId);
    }

    /**
     * GET /api/orders - Lists all orders.
     */
    @Get()
    async listOrders(): Promise<Order[]> {
        this.logger.log('📋 Listing all orders');
        return this.ordersService.listOrders();
    }
}
