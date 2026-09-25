import { Injectable } from "@nestjs/common";
import type { PaymentConfigDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { PaymentGatewayError } from "../../domain/payment/errors.js";
import { PaymentGateway } from "../ports/payment-gateway.port.js";

@Injectable()
export class GetPaymentConfigUseCase {
  constructor(private readonly gateway: PaymentGateway) {}

  async execute(): Promise<Result<PaymentConfigDto, PaymentGatewayError>> {
    try {
      const tokens = await this.gateway.getAcceptanceTokens();
      return ok(tokens);
    } catch (error) {
      if (error instanceof PaymentGatewayError) {
        return err(error);
      }
      return err(new PaymentGatewayError("Payment provider is unavailable"));
    }
  }
}
