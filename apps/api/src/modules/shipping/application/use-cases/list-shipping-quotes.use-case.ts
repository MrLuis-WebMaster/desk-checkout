import { Injectable } from "@nestjs/common";
import type {
  ShippingMethodQuoteDto,
  ShippingRegionCode,
} from "@checkout/contracts";
import { ok, type Result } from "#shared/result/result.js";
import { FeeCatalog } from "../ports/fee-catalog.port.js";

@Injectable()
export class ListShippingQuotesUseCase {
  constructor(private readonly feeCatalog: FeeCatalog) {}

  async execute(
    regionCode: ShippingRegionCode,
  ): Promise<Result<ShippingMethodQuoteDto[], never>> {
    return ok(await this.feeCatalog.listQuotes(regionCode));
  }
}
