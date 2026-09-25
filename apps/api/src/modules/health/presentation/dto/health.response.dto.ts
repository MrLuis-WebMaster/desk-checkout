import { ApiProperty } from "@nestjs/swagger";
import { TransactionStatus } from "@checkout/contracts";

export class HealthResponseDto {
  @ApiProperty({ example: "ok" })
  status!: "ok";

  @ApiProperty({
    example: {
      Pending: TransactionStatus.Pending,
      Approved: TransactionStatus.Approved,
      Declined: TransactionStatus.Declined,
      Error: TransactionStatus.Error,
      Expired: TransactionStatus.Expired,
    },
  })
  transactionStatuses!: typeof TransactionStatus;
}
