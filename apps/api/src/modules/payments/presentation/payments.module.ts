import { Module } from "@nestjs/common";
import { PaymentGateway } from "../application/ports/payment-gateway.port.js";
import { GetPaymentConfigUseCase } from "../application/use-cases/get-payment-config.use-case.js";
import { WompiHttpPaymentGateway } from "../infrastructure/wompi/wompi-http-payment-gateway.js";
import { PaymentsController } from "./controllers/payments.controller.js";

@Module({
  controllers: [PaymentsController],
  providers: [
    GetPaymentConfigUseCase,
    { provide: PaymentGateway, useClass: WompiHttpPaymentGateway },
  ],
  exports: [PaymentGateway],
})
export class PaymentsModule {}
