import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiExtraModels,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { ApiErrorCode } from "@checkout/contracts";
import { GetProductUseCase } from "../../application/use-cases/get-product.use-case.js";
import { ListProductsUseCase } from "../../application/use-cases/list-products.use-case.js";
import { ListProductsQueryDto } from "../dto/list-products.query.dto.js";
import { toListProductsQuery } from "../mappers/list-products.query.mapper.js";
import { ProductParamsDto } from "../dto/product-params.dto.js";
import { toProductId } from "../mappers/product-params.mapper.js";
import {
  ProductPageResponseDto,
  ProductResponseDto,
} from "../dto/product.response.dto.js";
import { throwApiError } from "#shared/presentation/http/throw-api-error.js";
import {
  ApiFailureDto,
  apiSuccessSchema,
} from "#shared/presentation/swagger/api-envelope.js";

@ApiTags("products")
@ApiExtraModels(ProductPageResponseDto, ProductResponseDto, ApiFailureDto)
@Controller("products")
export class ProductsController {
  constructor(
    private readonly listProducts: ListProductsUseCase,
    private readonly getProduct: GetProductUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: "Listar productos del catálogo" })
  @ApiOkResponse({ schema: apiSuccessSchema(ProductPageResponseDto) })
  @ApiBadRequestResponse({ type: ApiFailureDto })
  async list(@Query() query: ListProductsQueryDto) {
    const result = await this.listProducts.execute(toListProductsQuery(query));
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.ValidationError,
        "Invalid list query: use either page or after/before, not both",
        HttpStatus.BAD_REQUEST,
      );
    }
    return result.value;
  }

  @Get(":id")
  @ApiOperation({ summary: "Obtener un producto por id" })
  @ApiOkResponse({ schema: apiSuccessSchema(ProductResponseDto) })
  @ApiNotFoundResponse({ type: ApiFailureDto })
  async show(@Param() params: ProductParamsDto) {
    const result = await this.getProduct.execute(toProductId(params));
    if (!result.ok) {
      throwApiError(
        ApiErrorCode.ProductNotFound,
        "Product not found",
        HttpStatus.NOT_FOUND,
      );
    }
    return result.value;
  }
}
