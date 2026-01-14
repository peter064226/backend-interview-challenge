import { IsString, IsNumber, IsArray, ValidateNested, Min, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for order item.
 */
export class OrderItemDto {
    @IsString()
    productId!: string;

    @IsString()
    productName!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @Min(0)
    unitPrice!: number;
}

/**
 * DTO for creating a new order.
 */
export class CreateOrderDto {
    @IsString()
    customerId!: string;

    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => OrderItemDto)
    items!: OrderItemDto[];

    @IsNumber()
    @Min(0)
    totalAmount!: number;
}
