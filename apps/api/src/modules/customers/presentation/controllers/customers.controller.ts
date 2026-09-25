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
} from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { ApiErrorCode } from "@checkout/contracts";
import { STRICT_THROTTLE } from "#shared/infrastructure/http/throttle-limits.js";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";
import {
  ApiFailureDto,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { CreateCustomerUseCase } from "../../application/use-cases/create-customer.use-case.js";
import { GetCustomerUseCase } from "../../application/use-cases/get-customer.use-case.js";
import {
  CreateCustomerDto,
  CustomerParamsDto,
  CustomerResponseDto,
} from "../dto/customer.dto.js";

@ApiTags("customers")
@ApiExtraModels(CustomerResponseDto, ApiFailureDto)
@Controller("customers")
export class CustomersController {
  constructor(
    private readonly createCustomer: CreateCustomerUseCase,
    private readonly getCustomer: GetCustomerUseCase,
  ) {}

  @Post()
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: "Crear un cliente" })
  @ApiCreatedResponse({ schema: apiSuccessSchema(CustomerResponseDto) })
  async create(@Body() body: CreateCustomerDto) {
    const result = await this.createCustomer.execute(body);
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.Unexpected,
        "Unexpected customer error",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return result.value;
  }

  @Get(":id")
  @Throttle(STRICT_THROTTLE)
  @ApiOperation({ summary: "Obtener un cliente por id" })
  @ApiOkResponse({ schema: apiSuccessSchema(CustomerResponseDto) })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  async show(@Param() params: CustomerParamsDto) {
    const result = await this.getCustomer.execute(params.id);
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.CustomerNotFound,
        "Customer not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return result.value;
  }
}
