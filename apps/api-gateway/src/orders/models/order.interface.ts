/**
 * Order status enum.
 */
export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

/**
 * Order item interface.
 */
export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

/**
 * Order entity interface.
 */
export interface Order {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
}
