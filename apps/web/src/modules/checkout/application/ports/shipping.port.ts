import type {
  CheckoutSettingsDto,
  ShippingCityCode,
  ShippingMethodQuoteDto,
} from "@checkout/contracts";
import type { ScreenResult } from "@/shared/application/results/screen-result";

export abstract class ShippingPort {
  abstract getCheckoutSettings(
    signal?: AbortSignal,
  ): Promise<ScreenResult<CheckoutSettingsDto>>;

  abstract listShippingQuotes(
    city: ShippingCityCode,
    signal?: AbortSignal,
  ): Promise<ScreenResult<ShippingMethodQuoteDto[]>>;
}
