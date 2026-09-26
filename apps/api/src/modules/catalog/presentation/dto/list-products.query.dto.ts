import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  PRODUCT_LIST_IDS_MAX,
  PRODUCT_LIST_OFFSET_PAGE_MAX,
  PRODUCT_LIST_PAGE_SIZE,
  PRODUCT_ORDERS,
  PRODUCT_SORTS,
  type ProductOrder,
  type ProductSort,
} from "@checkout/contracts";

function toIdList({ value }: { value: unknown }): unknown {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }
  const parts = Array.isArray(value) ? value : [value];
  const ids = parts.flatMap((part) => {
    if (typeof part !== "string") {
      return [];
    }
    return part
      .split(",")
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  });
  return ids.length > 0 ? ids : undefined;
}

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
      "Cursor for the next page. Mutually exclusive with `page`, `before`, and `ids`.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  after?: string;

  @ApiPropertyOptional({
    maxLength: 2048,
    description:
      "Cursor for the previous page. Mutually exclusive with `page`, `after`, and `ids`.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  before?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: PRODUCT_LIST_OFFSET_PAGE_MAX,
    default: 1,
    type: Number,
    description:
      "1-based offset page. Only when `after`, `before`, and `ids` are omitted. Maximum 100; beyond that, use cursors.",
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PRODUCT_LIST_OFFSET_PAGE_MAX)
  page?: number;

  @ApiPropertyOptional({
    type: [String],
    format: "uuid",
    maxItems: PRODUCT_LIST_IDS_MAX,
    description:
      "Exact product ids (no cursor). Mutually exclusive with `after`, `before`, `page`, and `q`. Unknown ids are omitted; duplicates collapse.",
  })
  @IsOptional()
  @Transform(toIdList)
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(PRODUCT_LIST_IDS_MAX)
  @IsUUID("4", { each: true })
  ids?: string[];
}
