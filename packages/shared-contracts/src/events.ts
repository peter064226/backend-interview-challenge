/**
 * Event types used across applications.
 */

export interface BaseEvent {
    eventId: string;
    eventType: string;
    timestamp: string;
    source: string;
}

export interface OrderCreatedEvent extends BaseEvent {
    eventType: 'OrderCreated';
    payload: {
        orderId: string;
        customerId: string;
        totalAmount: number;
        itemCount: number;
    };
}

export interface OrderProcessedEvent extends BaseEvent {
    eventType: 'OrderProcessed';
    payload: {
        orderId: string;
        processingTimeMs: number;
        status: 'COMPLETED' | 'FAILED';
    };
}

/**
 * TASK FOR CANDIDATE:
 * Add a new event type for notifications.
 * NotificationSentEvent should include:
 * - notificationId: string
 * - orderId: string
 * - channel: 'EMAIL' | 'SMS' | 'PUSH'
 * - sentAt: string
 */
export type DomainEvent = OrderCreatedEvent | OrderProcessedEvent;
