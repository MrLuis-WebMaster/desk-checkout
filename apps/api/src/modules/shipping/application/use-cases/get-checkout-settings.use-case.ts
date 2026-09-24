import { Injectable } from "@nestjs/common";
import type { CheckoutSettingsDto } from "@checkout/contracts";
import { err, ok, type Result } from "#shared/result/result.js";
import { CheckoutSettingsNotFoundError } from "../../domain/fee/errors.js";
import { FeeCatalog } from "../ports/fee-catalog.port.js";

@Injectable()
export class GetCheckoutSettingsUseCase {
  constructor(private readonly feeCatalog: FeeCatalog) {}

  async execute(): Promise<
    Result<CheckoutSettingsDto, CheckoutSettingsNotFoundError>
  > {
    const baseFeeCents = await this.feeCatalog.getBaseFee();
    if (baseFeeCents === null) {
      return err(new CheckoutSettingsNotFoundError());
    }
    return ok({ baseFeeCents });
  }
}
