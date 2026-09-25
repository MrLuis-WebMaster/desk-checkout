import { Controller, Get, HttpStatus } from "@nestjs/common";
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
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { GetPaymentConfigUseCase } from "../../application/use-cases/get-payment-config.use-case.js";
import { PaymentConfigResponseDto } from "../dto/payment.dto.js";

@ApiTags("payments")
@ApiExtraModels(PaymentConfigResponseDto, ApiFailureDto)
@Controller("payments")
export class PaymentsController {
  constructor(private readonly getPaymentConfig: GetPaymentConfigUseCase) {}

  @Get("config")
  @ApiOperation({ summary: "Public Wompi config and acceptance tokens" })
  @ApiOkResponse({ schema: apiSuccessSchema(PaymentConfigResponseDto) })
  @ApiServiceUnavailableResponse({ type: ApiFailureDto })
  async config() {
    const result = await this.getPaymentConfig.execute();
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.PaymentFailed,
        "Payment provider is unavailable",
        HttpStatus.BAD_GATEWAY,
      );
    }
    return result.value;
  }
}
