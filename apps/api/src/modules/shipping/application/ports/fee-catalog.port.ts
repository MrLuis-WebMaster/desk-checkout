import type {
  ShippingCityCode,
  ShippingMethodQuoteDto,
} from "@checkout/contracts";

export type ShippingRateLookup = {
  methodFound: boolean;
  amount: number | null;
};

export abstract class FeeCatalog {
  abstract getBaseFee(): Promise<number | null>;
  abstract getRate(
    methodId: string,
    city: ShippingCityCode,
  ): Promise<ShippingRateLookup>;
  abstract listQuotes(city: ShippingCityCode): Promise<ShippingMethodQuoteDto[]>;
}
