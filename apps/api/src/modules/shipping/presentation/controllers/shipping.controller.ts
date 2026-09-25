import {
  Controller,
  Get,
  HttpStatus,
  Query,
} from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorCode } from "@checkout/contracts";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";
import {
  ApiFailureDto,
  apiSuccessArraySchema,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { GetCheckoutSettingsUseCase } from "../../application/use-cases/get-checkout-settings.use-case.js";
import { ListShippingQuotesUseCase } from "../../application/use-cases/list-shipping-quotes.use-case.js";
import {
  CheckoutSettingsResponseDto,
  ShippingCityQueryDto,
  ShippingMethodQuoteResponseDto,
} from "../dto/shipping.dto.js";

@ApiTags("shipping")
@ApiExtraModels(
  ShippingMethodQuoteResponseDto,
  CheckoutSettingsResponseDto,
  ApiFailureDto,
)
@Controller()
export class ShippingController {
  constructor(
    private readonly listShippingQuotes: ListShippingQuotesUseCase,
    private readonly getCheckoutSettings: GetCheckoutSettingsUseCase,
  ) {}

  @Get("shipping-methods")
  @ApiOperation({ summary: "List shipping methods and rates by city" })
  @ApiOkResponse({
    schema: apiSuccessArraySchema(ShippingMethodQuoteResponseDto),
  })
  async list(@Query() query: ShippingCityQueryDto) {
    const city = query.city ?? query.region;
    if (!city) {
      throwApiError(
        ApiErrorCode.ValidationError,
        "city must be one of the following values: BOG, MED, CALI, OTHER",
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.listShippingQuotes.execute(city);
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.Unexpected,
        "Unable to list shipping quotes",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return result.value;
  }

  @Get("checkout/settings")
  @ApiOperation({ summary: "Get checkout settings" })
  @ApiOkResponse({ schema: apiSuccessSchema(CheckoutSettingsResponseDto) })
  @ApiServiceUnavailableResponse({ type: ApiFailureDto })
  async settings() {
    const result = await this.getCheckoutSettings.execute();
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.CheckoutSettingsNotFound,
        "Checkout settings are unavailable",
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return result.value;
  }
}
