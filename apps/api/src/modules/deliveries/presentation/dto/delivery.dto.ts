import { Transform } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import {
  SHIPPING_CITY_CODES,
  type CreateDeliveryRequest,
  type DeliveryDto,
  type ShippingCityCode,
} from "@checkout/contracts";

function trimString({ value }: { value: unknown }): unknown {
  return typeof value === "string" ? value.trim() : value;
}

export class CreateDeliveryDto implements CreateDeliveryRequest {
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

export class DeliveryParamsDto {
  @ApiProperty({ format: "uuid" })
  @IsUUID("4")
  id!: string;
}

export class DeliveryResponseDto implements DeliveryDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty({ format: "uuid" })
  shippingMethodId!: string;

  @ApiProperty()
  addressLine!: string;

  @ApiProperty({ enum: SHIPPING_CITY_CODES })
  city!: ShippingCityCode;
}
