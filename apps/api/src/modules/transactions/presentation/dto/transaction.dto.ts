import { Type } from "class-transformer";
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
  ValidateNested,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  SHIPPING_REGION_CODES,
  TransactionStatus,
  type CreateTransactionRequest,
  type ShippingRegionCode,
  type TransactionDto,
} from "@checkout/contracts";

export class CreateTransactionCustomerDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  fullName!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
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
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  addressLine!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  city!: string;

  @ApiProperty({ enum: SHIPPING_REGION_CODES })
  @IsIn(SHIPPING_REGION_CODES)
  regionCode!: ShippingRegionCode;

  @ApiProperty()
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
  @ValidateNested()
  @Type(() => CreateTransactionCustomerDto)
  customer!: CreateTransactionCustomerDto;

  @ApiProperty({ type: CreateTransactionDeliveryDto })
  @ValidateNested()
  @Type(() => CreateTransactionDeliveryDto)
  delivery!: CreateTransactionDeliveryDto;
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

  @ApiProperty()
  productPrice!: number;

  @ApiProperty()
  baseFee!: number;

  @ApiProperty()
  deliveryFee!: number;

  @ApiProperty()
  total!: number;

  @ApiProperty({ type: CreateTransactionCustomerDto })
  customer!: CreateTransactionCustomerDto;

  @ApiProperty({ type: CreateTransactionDeliveryDto })
  delivery!: CreateTransactionDeliveryDto;

  @ApiProperty({ format: "date-time" })
  createdAt!: string;
}
