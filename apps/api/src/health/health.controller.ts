import { Controller, Get } from "@nestjs/common";
import { TransactionStatus } from "@checkout/contracts";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      transactionStatuses: Object.values(TransactionStatus),
    };
  }
}
