/**
 * Order types shared across applications.
 */

export enum OrderStatus {
    PENDING = 'PENDING',
    PROCESSING = 'PROCESSING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
}

export interface Order {
    orderId: string;
    customerId: string;
    items: OrderItem[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: string;
    updatedAt: string;
}

/**
 * TASK FOR CANDIDATE:
 * Add a Notification interface with the following fields:
 * - notificationId: string
 * - orderId: string
 * - message: string
 * - channel: 'EMAIL' | 'SMS' | 'PUSH'
 * - status: 'PENDING' | 'SENT' | 'FAILED'
 * - createdAt: string
 * - sentAt?: string
 */

export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
}

export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}

export interface Notification {
    notificationId: string;
    orderId: string;
    message: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    createdAt: string;
    sentAt?: string;
}
