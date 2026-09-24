import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { ApiErrorCode } from "@checkout/contracts";
import {
  ApiFailureDto,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../../application/use-cases/get-transaction.use-case.js";
import {
  CreateTransactionDto,
  TransactionParamsDto,
  TransactionResponseDto,
} from "../dto/transaction.dto.js";
import { toCreateTransactionRequest } from "../mappers/transaction.mapper.js";

@ApiTags("transactions")
@ApiExtraModels(TransactionResponseDto, ApiFailureDto)
@Controller("transactions")
export class TransactionsController {
  constructor(
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly getTransaction: GetTransactionUseCase,
  ) {}

  @Post()
  @ApiOperation({ summary: "Crear una transacción pendiente" })
  @ApiCreatedResponse({ schema: apiSuccessSchema(TransactionResponseDto) })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  @ApiConflictResponse({ type: ApiFailureDto })
  @ApiUnprocessableEntityResponse({ type: ApiFailureDto })
  @ApiServiceUnavailableResponse({ type: ApiFailureDto })
  async create(@Body() body: CreateTransactionDto) {
    const result = await this.createTransaction.execute(
      toCreateTransactionRequest(body),
    );
    if (!result.ok) {
      throwTransactionError(result.error.code);
    }
    return result.value;
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener una transacción" })
  @ApiOkResponse({ schema: apiSuccessSchema(TransactionResponseDto) })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  async show(@Param() params: TransactionParamsDto) {
    const result = await this.getTransaction.execute(params.id);
    if (!result.ok) {
      throw new HttpException(
        {
          code: ApiErrorCode.TransactionNotFound,
          message: "Transaction not found",
        },
        HttpStatus.NOT_FOUND,
      );
    }
    return result.value;
  }
}

function throwTransactionError(code: string): never {
  const errors: Record<string, { code: string; message: string; status: number }> =
    {
      PRODUCT_NOT_FOUND: {
        code: ApiErrorCode.ProductNotFound,
        message: "Product not found",
        status: HttpStatus.NOT_FOUND,
      },
      OUT_OF_STOCK: {
        code: ApiErrorCode.OutOfStock,
        message: "Product is out of stock",
        status: HttpStatus.CONFLICT,
      },
      SHIPPING_METHOD_NOT_FOUND: {
        code: ApiErrorCode.ShippingMethodNotFound,
        message: "Shipping method not found or inactive",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      },
      SHIPPING_RATE_NOT_FOUND: {
        code: ApiErrorCode.ShippingRateNotFound,
        message: "Shipping rate not found",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      },
      CHECKOUT_SETTINGS_NOT_FOUND: {
        code: ApiErrorCode.CheckoutSettingsNotFound,
        message: "Checkout settings are unavailable",
        status: HttpStatus.SERVICE_UNAVAILABLE,
      },
    };
  const mapped = errors[code] ?? {
    code: ApiErrorCode.Unexpected,
    message: "Unexpected transaction error",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  };
  throw new HttpException(
    { code: mapped.code, message: mapped.message },
    mapped.status,
  );
}
