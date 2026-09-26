import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsOptional } from "class-validator";
import {
  SHIPPING_CITY_CODES,
  type CheckoutSettingsDto,
  type ShippingCityCode,
  type ShippingMethodQuoteDto,
} from "@checkout/contracts";

export class ShippingCityQueryDto {
  @ApiPropertyOptional({ enum: SHIPPING_CITY_CODES })
  @IsOptional()
  @IsIn(SHIPPING_CITY_CODES)
  city?: ShippingCityCode;

  @ApiPropertyOptional({
    enum: SHIPPING_CITY_CODES,
    deprecated: true,
    description: "Deprecated. Use `city`.",
  })
  @IsOptional()
  @IsIn(SHIPPING_CITY_CODES)
  region?: ShippingCityCode;
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

  @ApiProperty({
    description: "Fee in the same integer COP units as product.price",
  })
  amount!: number;
}

export class CheckoutSettingsResponseDto implements CheckoutSettingsDto {
  @ApiProperty({
    description: "Base fee in the same integer COP units as product.price",
  })
  baseFee!: number;
}
