import { Injectable } from "@nestjs/common";
import type {
  ShippingCityCode,
  ShippingMethodQuoteDto,
} from "@checkout/contracts";
import { ok, type Result } from "#shared/result/result.js";
import { FeeCatalog } from "../ports/fee-catalog.port.js";

@Injectable()
export class ListShippingQuotesUseCase {
  constructor(private readonly feeCatalog: FeeCatalog) {}

  async execute(
    city: ShippingCityCode,
  ): Promise<Result<ShippingMethodQuoteDto[], never>> {
    return ok(await this.feeCatalog.listQuotes(city));
  }
}
