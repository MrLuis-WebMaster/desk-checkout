import {
  Controller,
  Get,
  HttpException,
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
import {
  ApiFailureDto,
  apiSuccessArraySchema,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { GetCheckoutSettingsUseCase } from "../../application/use-cases/get-checkout-settings.use-case.js";
import { ListShippingQuotesUseCase } from "../../application/use-cases/list-shipping-quotes.use-case.js";
import {
  CheckoutSettingsResponseDto,
  ShippingMethodQuoteResponseDto,
  ShippingRegionQueryDto,
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
  @ApiOperation({ summary: "Listar métodos y tarifas de envío por región" })
  @ApiOkResponse({
    schema: apiSuccessArraySchema(ShippingMethodQuoteResponseDto),
  })
  async list(@Query() query: ShippingRegionQueryDto) {
    const result = await this.listShippingQuotes.execute(query.region);
    if (!result.ok) {
      throw new HttpException(
        {
          code: ApiErrorCode.Unexpected,
          message: "Unable to list shipping quotes",
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return result.value;
  }

  @Get("checkout/settings")
  @ApiOperation({ summary: "Obtener configuración de checkout" })
  @ApiOkResponse({ schema: apiSuccessSchema(CheckoutSettingsResponseDto) })
  @ApiServiceUnavailableResponse({ type: ApiFailureDto })
  async settings() {
    const result = await this.getCheckoutSettings.execute();
    if (!result.ok) {
      throw new HttpException(
        {
          code: ApiErrorCode.CheckoutSettingsNotFound,
          message: "Checkout settings are unavailable",
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    return result.value;
  }
}
