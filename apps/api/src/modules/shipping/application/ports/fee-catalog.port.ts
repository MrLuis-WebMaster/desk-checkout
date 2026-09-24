import type {
  ShippingMethodQuoteDto,
  ShippingRegionCode,
} from "@checkout/contracts";

export type ShippingRateLookup = {
  methodFound: boolean;
  amountCents: number | null;
};

export abstract class FeeCatalog {
  abstract getBaseFee(): Promise<number | null>;
  abstract getRate(
    methodId: string,
    regionCode: ShippingRegionCode,
  ): Promise<ShippingRateLookup>;
  abstract listQuotes(
    regionCode: ShippingRegionCode,
  ): Promise<ShippingMethodQuoteDto[]>;
}
