import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FeeCatalog } from "../application/ports/fee-catalog.port.js";
import { GetCheckoutSettingsUseCase } from "../application/use-cases/get-checkout-settings.use-case.js";
import { ListShippingQuotesUseCase } from "../application/use-cases/list-shipping-quotes.use-case.js";
import { CheckoutSettingOrmEntity } from "../infrastructure/typeorm/checkout-setting.orm-entity.js";
import { ShippingMethodOrmEntity } from "../infrastructure/typeorm/shipping-method.orm-entity.js";
import { ShippingRateOrmEntity } from "../infrastructure/typeorm/shipping-rate.orm-entity.js";
import { TypeOrmFeeCatalog } from "../infrastructure/typeorm/typeorm-fee-catalog.js";
import { ShippingController } from "./controllers/shipping.controller.js";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CheckoutSettingOrmEntity,
      ShippingMethodOrmEntity,
      ShippingRateOrmEntity,
    ]),
  ],
  controllers: [ShippingController],
  providers: [
    GetCheckoutSettingsUseCase,
    ListShippingQuotesUseCase,
    { provide: FeeCatalog, useClass: TypeOrmFeeCatalog },
  ],
  exports: [FeeCatalog],
})
export class ShippingModule {}
