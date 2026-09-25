import { ApiProperty } from "@nestjs/swagger";
import type { PaymentConfigDto } from "@checkout/contracts";

export class PaymentConfigResponseDto implements PaymentConfigDto {
  @ApiProperty()
  publicKey!: string;

  @ApiProperty()
  acceptanceToken!: string;

  @ApiProperty()
  acceptanceTokenType!: string;

  @ApiProperty()
  acceptPersonalAuth!: string;

  @ApiProperty()
  acceptPersonalAuthType!: string;
}
