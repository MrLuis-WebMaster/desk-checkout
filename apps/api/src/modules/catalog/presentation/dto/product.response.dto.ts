import { ApiProperty } from "@nestjs/swagger";

export class ProductSummaryResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ example: 19900 })
  price!: number;

  @ApiProperty({ example: "https://cdn.example.com/product.jpg" })
  imageUrl!: string;

  @ApiProperty({ example: 12 })
  availableStock!: number;
}

export class ProductResponseDto extends ProductSummaryResponseDto {
  @ApiProperty()
  description!: string;
}

export class ProductPageResponseDto {
  @ApiProperty({ type: [ProductSummaryResponseDto] })
  items!: ProductSummaryResponseDto[];

  @ApiProperty({ example: 10 })
  pageSize!: number;

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ type: String, nullable: true })
  nextCursor!: string | null;

  @ApiProperty({ type: String, nullable: true })
  prevCursor!: string | null;
}
