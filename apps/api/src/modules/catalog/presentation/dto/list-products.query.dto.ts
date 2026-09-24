import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  PRODUCT_LIST_PAGE_SIZE,
  PRODUCT_ORDERS,
  PRODUCT_SORTS,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";

export class ListProductsQueryDto {
  @ApiPropertyOptional({
    minimum: PRODUCT_LIST_PAGE_SIZE.min,
    maximum: PRODUCT_LIST_PAGE_SIZE.max,
    default: PRODUCT_LIST_PAGE_SIZE.default,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(PRODUCT_LIST_PAGE_SIZE.min)
  @Max(PRODUCT_LIST_PAGE_SIZE.max)
  pageSize = PRODUCT_LIST_PAGE_SIZE.default;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: PRODUCT_SORTS, default: "name" })
  @IsOptional()
  @IsIn([...PRODUCT_SORTS])
  sort: ProductSort = "name";

  @ApiPropertyOptional({ enum: PRODUCT_ORDERS, default: "asc" })
  @IsOptional()
  @IsIn([...PRODUCT_ORDERS])
  order: ProductOrder = "asc";

  @ApiPropertyOptional({
    maxLength: 2048,
    description:
      "Cursor de la página siguiente. Mutuamente excluyente con `page` y `before`.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  after?: string;

  @ApiPropertyOptional({
    maxLength: 2048,
    description:
      "Cursor de la página anterior. Mutuamente excluyente con `page` y `after`.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  before?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: 100,
    default: 1,
    type: Number,
    description:
      "Página 1-based (offset). Solo cuando no se envían `after`/`before`.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  page?: number;
}
