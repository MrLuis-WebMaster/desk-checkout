import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DeliveryOrmEntity } from "@checkout/settlement-typeorm";
import { ShippingModule } from "#modules/shipping/presentation/shipping.module.js";
import { DeliveryRepository } from "../application/ports/delivery-repository.port.js";
import { CreateDeliveryUseCase } from "../application/use-cases/create-delivery.use-case.js";
import { GetDeliveryUseCase } from "../application/use-cases/get-delivery.use-case.js";
import { TypeOrmDeliveryRepository } from "../infrastructure/typeorm/typeorm-delivery-repository.js";
import { DeliveriesController } from "./controllers/deliveries.controller.js";

@Module({
  imports: [
    ShippingModule,
    TypeOrmModule.forFeature([DeliveryOrmEntity]),
  ],
  controllers: [DeliveriesController],
  providers: [
    CreateDeliveryUseCase,
    GetDeliveryUseCase,
    {
      provide: DeliveryRepository,
      useClass: TypeOrmDeliveryRepository,
    },
  ],
})
export class DeliveriesModule {}
