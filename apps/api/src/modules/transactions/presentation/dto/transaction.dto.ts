import { Transform, Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsDefined,
  IsEmail,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  DeliveryStatus,
  SHIPPING_CITY_CODES,
  TransactionStatus,
  type CreateTransactionRequest,
  type PayTransactionRequest,
  type ShippingCityCode,
  type SyncProviderPaymentRequest,
  type TransactionDto,
  type WidgetCheckoutSessionDto,
} from "@checkout/contracts";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateTransactionCustomerDto {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsEmail()
  email!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone!: string;
}

export class CreateTransactionDeliveryDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  shippingMethodId!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  addressLine!: string;

  @ApiProperty({ enum: SHIPPING_CITY_CODES })
  @IsIn(SHIPPING_CITY_CODES)
  city!: ShippingCityCode;
}

export class CreateTransactionItemDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  productId!: string;

  @ApiProperty({ minimum: 1, maximum: 99 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CreateTransactionDto implements CreateTransactionRequest {
  @ApiProperty({ type: [CreateTransactionItemDto], minItems: 1 })
  @IsDefined()
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateTransactionItemDto)
  items!: CreateTransactionItemDto[];

  @ApiProperty({ type: CreateTransactionCustomerDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateTransactionCustomerDto)
  customer!: CreateTransactionCustomerDto;

  @ApiProperty({ type: CreateTransactionDeliveryDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateTransactionDeliveryDto)
  delivery!: CreateTransactionDeliveryDto;
}

export class PayTransactionDto implements PayTransactionRequest {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  paymentMethodToken!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  acceptanceToken!: string;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  acceptPersonalAuth!: string;

  @ApiProperty({ required: false, default: 1, minimum: 1, maximum: 36 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(36)
  installments?: number;
}

export class SyncProviderPaymentDto implements SyncProviderPaymentRequest {
  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  providerTransactionId!: string;
}

export class WidgetCheckoutSessionResponseDto
  implements WidgetCheckoutSessionDto
{
  @ApiProperty()
  publicKey!: string;

  @ApiProperty()
  amountInCents!: number;

  @ApiProperty({ enum: ["COP"] })
  currency!: "COP";

  @ApiProperty()
  reference!: string;

  @ApiProperty()
  signature!: string;
}

export class TransactionParamsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;
}

export class TransactionLineResponseDto {
  @ApiProperty({ format: "uuid" })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty({
    description: "Snapshot product price in integer COP units",
  })
  productPrice!: number;

  @ApiProperty({ minimum: 1 })
  quantity!: number;
}

export class TransactionDeliveryResponseDto {
  @ApiProperty({ format: "uuid" })
  shippingMethodId!: string;

  @ApiProperty()
  addressLine!: string;

  @ApiProperty({ enum: SHIPPING_CITY_CODES })
  city!: ShippingCityCode;

  @ApiProperty({ enum: DeliveryStatus })
  status!: DeliveryStatus;
}

export class TransactionResponseDto implements TransactionDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ enum: TransactionStatus })
  status!: TransactionStatus;

  @ApiProperty({ format: "uuid" })
  productId!: string;

  @ApiProperty()
  productName!: string;

  @ApiProperty({
    description: "Snapshot product price in integer COP units",
  })
  productPrice!: number;

  @ApiProperty({ minimum: 1 })
  quantity!: number;

  @ApiProperty({ type: [TransactionLineResponseDto] })
  lines!: TransactionLineResponseDto[];

  @ApiProperty({
    description: "Snapshot base fee in integer COP units",
  })
  baseFee!: number;

  @ApiProperty({
    description: "Snapshot delivery fee in integer COP units",
  })
  deliveryFee!: number;

  @ApiProperty({
    description: "Snapshot total in integer COP units",
  })
  total!: number;

  @ApiProperty({ type: CreateTransactionCustomerDto })
  customer!: CreateTransactionCustomerDto;

  @ApiProperty({ type: TransactionDeliveryResponseDto })
  delivery!: TransactionDeliveryResponseDto;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
