import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GetProductUseCase } from "../application/use-cases/get-product.use-case.js";
import { ListProductsUseCase } from "../application/use-cases/list-products.use-case.js";
import { ProductReader } from "../application/ports/product-reader.port.js";
import { ProductOrmEntity } from "../infrastructure/typeorm/product.orm-entity.js";
import { TypeOrmProductReader } from "../infrastructure/typeorm/typeorm-product-reader.js";
import { ProductsController } from "./controllers/products.controller.js";

@Module({
  imports: [TypeOrmModule.forFeature([ProductOrmEntity])],
  controllers: [ProductsController],
  providers: [
    ListProductsUseCase,
    GetProductUseCase,
    {
      provide: ProductReader,
      useClass: TypeOrmProductReader,
    },
  ],
})
export class CatalogModule {}
