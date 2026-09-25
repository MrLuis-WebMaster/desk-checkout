import {
  Body,
  Controller,
  Get,
  Headers,
  HttpStatus,
  Param,
  Post,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiHeader,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnprocessableEntityResponse,
} from "@nestjs/swagger";
import { ApiErrorCode } from "@checkout/contracts";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";
import {
  ApiFailureDto,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";
import { CreateTransactionUseCase } from "../../application/use-cases/create-transaction.use-case.js";
import { GetTransactionUseCase } from "../../application/use-cases/get-transaction.use-case.js";
import { PayTransactionUseCase } from "../../application/use-cases/pay-transaction.use-case.js";
import {
  CreateTransactionDto,
  PayTransactionDto,
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
    private readonly payTransaction: PayTransactionUseCase,
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
      throwApiError(
        ApiErrorCode.TransactionNotFound,
        "Transaction not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return result.value;
  }

  @Post(":id/pay")
  @ApiOperation({ summary: "Pay a pending transaction with a card token" })
  @ApiHeader({ name: "Idempotency-Key", required: true })
  @ApiOkResponse({ schema: apiSuccessSchema(TransactionResponseDto) })
  @ApiBadRequestResponse({ type: ApiFailureDto })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  @ApiConflictResponse({ type: ApiFailureDto })
  @ApiUnprocessableEntityResponse({ type: ApiFailureDto })
  async pay(
    @Param() params: TransactionParamsDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Body() body: PayTransactionDto,
  ) {
    const key = idempotencyKey?.trim();
    if (!key) {
      throwApiError(
        ApiErrorCode.ValidationError,
        "Idempotency-Key header is required",
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.payTransaction.execute(params.id, key, body);
    if (!result.ok) {
      throwTransactionError(result.error.code);
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
      PAYMENT_FAILED: {
        code: ApiErrorCode.PaymentFailed,
        message: "Payment provider rejected the charge",
        status: HttpStatus.BAD_GATEWAY,
      },
      INVALID_TRANSACTION_STATE: {
        code: ApiErrorCode.InvalidTransactionState,
        message: "Transaction cannot be paid in its current state",
        status: HttpStatus.UNPROCESSABLE_ENTITY,
      },
      IDEMPOTENCY_CONFLICT: {
        code: ApiErrorCode.IdempotencyConflict,
        message: "Idempotency key does not match this request",
        status: HttpStatus.CONFLICT,
      },
    };
  const mapped = errors[code] ?? {
    code: ApiErrorCode.Unexpected,
    message: "Unexpected transaction error",
    status: HttpStatus.INTERNAL_SERVER_ERROR,
  };
  throwApiError(mapped.code, mapped.message, mapped.status);
}
