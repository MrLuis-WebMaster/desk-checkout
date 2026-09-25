import { Transform, Type } from "class-transformer";
import {
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
  SHIPPING_REGION_CODES,
  TransactionStatus,
  type CreateTransactionRequest,
  type PayTransactionRequest,
  type ShippingRegionCode,
  type TransactionDto,
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

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiProperty({ enum: SHIPPING_REGION_CODES })
  @IsIn(SHIPPING_REGION_CODES)
  regionCode!: ShippingRegionCode;

  @ApiProperty()
  @Transform(trimString)
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode!: string;
}

export class CreateTransactionDto implements CreateTransactionRequest {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  productId!: string;

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

export class TransactionParamsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;
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

  @ApiProperty({ type: CreateTransactionDeliveryDto })
  delivery!: CreateTransactionDeliveryDto;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
