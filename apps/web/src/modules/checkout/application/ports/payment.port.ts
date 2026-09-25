import type { PaymentConfigDto } from "@checkout/contracts";
import type { ScreenResult } from "@/shared/application/results/screen-result";

export abstract class PaymentPort {
  abstract getPaymentConfig(
    signal?: AbortSignal,
  ): Promise<ScreenResult<PaymentConfigDto>>;
}
