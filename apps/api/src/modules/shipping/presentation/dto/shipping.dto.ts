import { ApiProperty } from "@nestjs/swagger";
import { IsIn } from "class-validator";
import {
  SHIPPING_REGION_CODES,
  type CheckoutSettingsDto,
  type ShippingMethodQuoteDto,
  type ShippingRegionCode,
} from "@checkout/contracts";

export class ShippingRegionQueryDto {
  @ApiProperty({ enum: SHIPPING_REGION_CODES })
  @IsIn(SHIPPING_REGION_CODES)
  region!: ShippingRegionCode;
}

export class ShippingMethodQuoteResponseDto
  implements ShippingMethodQuoteDto
{
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  code!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  amountCents!: number;
}

export class CheckoutSettingsResponseDto implements CheckoutSettingsDto {
  @ApiProperty()
  baseFeeCents!: number;
}
