import { IsString, IsEnum } from 'class-validator';

/**
 * Notification channel enum.
 */
export enum NotificationChannel {
    EMAIL = 'EMAIL',
    SMS = 'SMS',
    PUSH = 'PUSH',
}

/**
 * DTO for creating a new notification request.
 */
export class CreateNotificationDto {
    @IsString()
    orderId!: string;

    @IsString()
    message!: string;

    @IsEnum(NotificationChannel)
    channel!: NotificationChannel;
}
