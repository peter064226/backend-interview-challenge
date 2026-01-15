/**
 * Notification status enum.
 */
export enum NotificationStatus {
    PENDING = 'PENDING',
    SENT = 'SENT',
    FAILED = 'FAILED',
}

/**
 * Notification channel enum.
 */
export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
}

/**
 * Notification entity interface.
 */
export interface Notification {
    notificationId: string;
    orderId: string;
    message: string;
    channel: NotificationChannel;
    status: NotificationStatus;
    createdAt: string;
    sentAt?: string;
}
