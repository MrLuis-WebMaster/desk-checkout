import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiErrorCode } from "@checkout/contracts";
import { STRICT_THROTTLE } from "#shared/infrastructure/http/throttle-limits.js";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";
import {
  ApiFailureDto,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { CreateDeliveryUseCase } from "../../application/use-cases/create-delivery.use-case.js";
import { GetDeliveryUseCase } from "../../application/use-cases/get-delivery.use-case.js";
import {
  CreateDeliveryDto,
  DeliveryParamsDto,
  DeliveryResponseDto,
} from "../dto/delivery.dto.js";

@ApiTags("deliveries")
@ApiExtraModels(DeliveryResponseDto, ApiFailureDto)
@Controller("deliveries")
export class DeliveriesController {
  constructor(
    private readonly createDelivery: CreateDeliveryUseCase,
    private readonly getDelivery: GetDeliveryUseCase,
  ) {}

  @Post()
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: "Create a delivery" })
  @ApiCreatedResponse({ schema: apiSuccessSchema(DeliveryResponseDto) })
  @ApiUnprocessableEntityResponse({ type: ApiFailureDto })
  async create(@Body() body: CreateDeliveryDto) {
    const result = await this.createDelivery.execute(body);
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.ShippingMethodNotFound,
        "Shipping method not found or inactive",
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }
    return result.value;
  }

  @Get(":id")
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: "Get a delivery by id" })
  @ApiOkResponse({ schema: apiSuccessSchema(DeliveryResponseDto) })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  async show(@Param() params: DeliveryParamsDto) {
    const result = await this.getDelivery.execute(params.id);
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.DeliveryNotFound,
        "Delivery not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return result.value;
  }
}
